#ifndef LIVI_GST_HOST_STANDALONE
#include <node_api.h>
#endif
#include <gst/gst.h>
#include <gst/app/gstappsrc.h>
#include <gst/base/gstbasesink.h>
#include <gst/video/videooverlay.h>
#include <gst/video/video.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <initializer_list>
#include <string>
#ifdef __linux__
#include <execinfo.h>
#include <fcntl.h>
#include <glib-unix.h>
#include <signal.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#endif

// Native window attach is platform-specific: the macOS (Cocoa) implementation lives in
// gst_video_mac.mm, the Windows (Win32) one in gst_video_win.cc. Both put the video in a
// native surface under the transparent UI. Linux runs under livi-compositor (waylandsink is
// its own client placed below the UI), so it uses the bare handle and the no-op stubs.
#if defined(__APPLE__) || defined(_WIN32)
extern "C" guintptr livi_attach_view(guintptr parent, void** outView);
extern "C" void livi_remove_view(void* view);
extern "C" void livi_set_view_hidden(void* view, bool hidden);
extern "C" void livi_set_content_region(void* view, void* sink, double cropL,
    double cropT, double visW, double visH, double tierW, double tierH);
extern "C" void livi_set_backdrop(guintptr parent, double r, double g, double b);
#else
[[maybe_unused]] static guintptr livi_attach_view(guintptr parent, void** outView) {
  *outView = nullptr;
  return parent;
}
[[maybe_unused]] static void livi_remove_view(void*) {}
[[maybe_unused]] static void livi_set_view_hidden(void*, bool) {}
[[maybe_unused]] static void livi_set_content_region(void*, void*, double, double, double, double,
    double, double) {}
[[maybe_unused]] static void livi_set_backdrop(guintptr, double, double, double) {}
#endif

struct Player {
  GstElement* pipeline = nullptr;
  GstElement* appsrc = nullptr;
  GstElement* sink = nullptr;
  void* view = nullptr;
};

static void ensure_init() {
  static bool done = false;
  if (!done) {
    g_set_prgname("livi-video");
    gst_init(NULL, NULL);
    // Opt-in verbose decode/sink tracing
    if (const char* dbg = getenv("LIVI_GST_DEBUG")) {
      gst_debug_set_threshold_from_string(
        (dbg[0] == '1' && dbg[1] == '\0')
          ? "v4l2codecs-decoder:6,v4l2codecs-h265dec:6,waylandsink:5,wl_dmabuf:6"
          : dbg,
        FALSE);
    }
    done = true;
  }
}

static GstBusSyncReply bus_sync(GstBus*, GstMessage* msg, gpointer) {
  GstMessageType t = GST_MESSAGE_TYPE(msg);
  if (t == GST_MESSAGE_ERROR) {
    GError* e = nullptr; gchar* d = nullptr;
    gst_message_parse_error(msg, &e, &d);
    fprintf(stderr, "[gst_video] ERROR from %s: %s | %s\n",
      GST_OBJECT_NAME(msg->src), e ? e->message : "?", d ? d : "");
    if (e) g_error_free(e);
    g_free(d);
  } else if (t == GST_MESSAGE_WARNING) {
    GError* e = nullptr; gchar* d = nullptr;
    gst_message_parse_warning(msg, &e, &d);
    fprintf(stderr, "[gst_video] WARN from %s: %s | %s\n",
      GST_OBJECT_NAME(msg->src), e ? e->message : "?", d ? d : "");
    if (e) g_error_free(e);
    g_free(d);
  }
  return GST_BUS_PASS;
}

// Force every base sink in the pipeline to render unsynced (live, drop-late)
static void force_sinks_realtime(GstElement* pipeline) {
  GstIterator* it = gst_bin_iterate_recurse(GST_BIN(pipeline));
  GValue item = G_VALUE_INIT;
  gboolean done = FALSE;
  while (!done) {
    switch (gst_iterator_next(it, &item)) {
      case GST_ITERATOR_OK: {
        GstElement* el = GST_ELEMENT(g_value_get_object(&item));
        if (GST_IS_BASE_SINK(el)) {
          g_object_set(el, "sync", FALSE, "qos", FALSE, "max-lateness", (gint64)0, NULL);
        }
        g_value_reset(&item);
        break;
      }
      case GST_ITERATOR_RESYNC:
        gst_iterator_resync(it);
        break;
      case GST_ITERATOR_ERROR:
      case GST_ITERATOR_DONE:
        done = TRUE;
        break;
    }
  }
  g_value_unset(&item);
  gst_iterator_free(it);
}

// Log the decoded video caps once (format + memory) to diagnose the path
static GstPadProbeReturn caps_probe(GstPad*, GstPadProbeInfo* info, gpointer) {
  GstEvent* ev = GST_PAD_PROBE_INFO_EVENT(info);
  if (ev && GST_EVENT_TYPE(ev) == GST_EVENT_CAPS) {
    GstCaps* caps = nullptr;
    gst_event_parse_caps(ev, &caps);
    gchar* s = gst_caps_to_string(caps);
    fprintf(stderr, "[gst_video] decoded caps: %s\n", s ? s : "?");
    g_free(s);
    return GST_PAD_PROBE_REMOVE;
  }
  return GST_PAD_PROBE_OK;
}

// Advertise GstVideoMeta in the decoder's ALLOCATION query. The Pi v4l2codecs
// decoder zero-copies a frame whose coded buffer layout differs from the
// display size (1080p is coded at 1088, bottom-cropped) ONLY when downstream
// advertises GstVideoMeta. Otherwise it sees an offset mismatch and falls
// back to a system-memory copy ("GstVideoMeta support required, copying frames"
// in gstv4l2codech265dec.c). waylandsink does not advertise it, so we add it.
// Combined with the distro plugin's crop fix (need_crop only on x/y offset),
// this makes 1080p zero-copy. NOTE: only add the meta, never a buffer pool here
// (a generic pool can't describe DMA_DRM and crashes the decoder with QBUF
// EINVAL). 720p needs no crop and zero-copies regardless.
static GstPadProbeReturn alloc_meta_probe(GstPad*, GstPadProbeInfo* info, gpointer) {
  GstQuery* query = GST_PAD_PROBE_INFO_QUERY(info);
  if (query && GST_QUERY_TYPE(query) == GST_QUERY_ALLOCATION) {
    gboolean had = gst_query_find_allocation_meta(query, GST_VIDEO_META_API_TYPE, NULL);
    if (!had) gst_query_add_allocation_meta(query, GST_VIDEO_META_API_TYPE, NULL);
    fprintf(stderr, "[gst_video] ALLOC query: had_videometa=%d added=%d\n", had, !had);
  }
  return GST_PAD_PROBE_OK;
}

// DIAGNOSTIC (temporary)
static GstPadProbeReturn buffer_probe(GstPad*, GstPadProbeInfo* info, gpointer) {
  GstBuffer* buf = GST_PAD_PROBE_INFO_BUFFER(info);
  if (!buf) return GST_PAD_PROBE_OK;
  guint n = gst_buffer_n_memory(buf);
  fprintf(stderr, "[gst_video] sink buffer: n_memory=%u size=%" G_GSIZE_FORMAT "\n",
    n, gst_buffer_get_size(buf));
  for (guint i = 0; i < n; i++) {
    GstMemory* m = gst_buffer_peek_memory(buf, i);
    fprintf(stderr, "[gst_video]   mem[%u] alloc=%s\n", i,
      (m && m->allocator && m->allocator->mem_type) ? m->allocator->mem_type : "(null)");
  }
  GstVideoMeta* vm = gst_buffer_get_video_meta(buf);
  if (vm)
    fprintf(stderr, "[gst_video]   videometa n_planes=%u stride0=%d offset1=%" G_GSIZE_FORMAT "\n",
      vm->n_planes, (int)vm->stride[0], vm->n_planes > 1 ? vm->offset[1] : (gsize)0);
  else
    fprintf(stderr, "[gst_video]   videometa: NONE\n");
  return GST_PAD_PROBE_REMOVE;
}

static void remove_video_view(Player* p) {
  if (p->view) {
    livi_remove_view(p->view);
    p->view = nullptr;
  }
}

static const char* parser_for(const std::string& c) {
  if (c == "h265") return "h265parse";
  if (c == "vp9") return "vp9parse";
  if (c == "av1") return "av1parse";
  return "h264parse";
}

// First decoder in the list whose factory is registered; falls back to the
// last entry (software) so the pipeline string is still valid.
static const char* pick_decoder(std::initializer_list<const char*> cands) {
  const char* last = "";
  for (const char* c : cands) {
    last = c;
    GstElementFactory* f = gst_element_factory_find(c);
    if (f) {
      gst_object_unref(f);
      return c;
    }
  }
  return last;
}

// Software decoders (everything else, vtdec/v4l2*/va*/d3d11*, is HW)
static bool is_hw_decoder(const char* name) {
  if (!name || !*name) return false;
  if (strncmp(name, "avdec_", 6) == 0) return false;
  if (strcmp(name, "vp9dec") == 0 || strcmp(name, "vp8dec") == 0) return false;
  if (strcmp(name, "dav1ddec") == 0 || strcmp(name, "openh264dec") == 0) return false;
  return true;
}

#ifndef LIVI_GST_HOST_STANDALONE
static bool factory_exists(const char* name) {
  GstElementFactory* f = name && *name ? gst_element_factory_find(name) : nullptr;
  if (f) {
    gst_object_unref(f);
    return true;
  }
  return false;
}

// Primary software decoder per codec, used to report SW availability
static const char* sw_decoder_for(const std::string& c) {
  if (c == "h265") return "avdec_h265";
  if (c == "vp9") return "vp9dec";
  if (c == "av1") return "dav1ddec";
  return "avdec_h264";
}
#endif

// Best available decoder per codec, HW-first then software fallback. Adapts at
// runtime: Pi5 stateless v4l2sl, Pi4 v4l2, x86 VA-API, mac vtdec, win d3d11
static const char* decoder_for(const std::string& c) {
  if (getenv("LIVI_GST_SWDEC")) {
    if (c == "h265") return "avdec_h265";
    if (c == "vp9") return "vp9dec";
    if (c == "av1") return "dav1ddec";
    return "avdec_h264";
  }
#ifdef __APPLE__
  if (c == "h265") return pick_decoder({"vtdec", "avdec_h265"});
  if (c == "vp9") return pick_decoder({"vp9dec"});
  if (c == "av1") return pick_decoder({"dav1ddec"});
  return pick_decoder({"vtdec", "avdec_h264"});
#elif defined(_WIN32)
  if (c == "h265") return pick_decoder({"d3d11h265dec", "avdec_h265"});
  if (c == "vp9") return pick_decoder({"d3d11vp9dec", "vp9dec"});
  if (c == "av1") return pick_decoder({"d3d11av1dec", "dav1ddec"});
  return pick_decoder({"d3d11h264dec", "avdec_h264"});
#else
  if (c == "h265") return pick_decoder({"v4l2slh265dec", "v4l2h265dec", "vah265dec", "avdec_h265"});
  if (c == "vp9") return pick_decoder({"v4l2slvp9dec", "v4l2vp9dec", "vavp9dec", "vp9dec"});
  if (c == "av1") return pick_decoder({"vaav1dec", "dav1ddec"});
  return pick_decoder({"v4l2slh264dec", "v4l2h264dec", "vah264dec", "avdec_h264"});
#endif
}

// Sink chain per platform. Linux presents the decoded dmabuf to the
// livi-compositor via waylandsink (zero-copy); the compositor lays it under the
// Electron UI. mac/Windows render into the window surface directly.
static std::string sink_chain() {
#ifdef __APPLE__
  // force-aspect-ratio=false: the clip view already enforces the content AR, glimagesink must fill
  // the render surface instead of padding it with black borders (which cover the window backdrop).
  return "glimagesink name=sink sync=false qos=false force-aspect-ratio=false";
#elif defined(_WIN32)
  return "d3d11videosink name=sink sync=false qos=false force-aspect-ratio=false";
#else
  // waylandsink hands the decoded dmabuf (incl. the Pi's SAND-tiled NV12) to
  // livi-compositor zero-copy; the compositor samples it as a YUV texture and the
  // GPU does the colour conversion. LIVI_GST_SINK overrides for debugging.
  const char* sink_env = getenv("LIVI_GST_SINK");
  return std::string(sink_env && *sink_env ? sink_env : "waylandsink") +
    " name=sink sync=false";
#endif
}

static std::string caps_for(const std::string& c) {
  if (c == "h265") return "video/x-h265,stream-format=byte-stream";
  if (c == "vp9") return "video/x-vp9";
  if (c == "av1") return "video/x-av1";
  return "video/x-h264,stream-format=byte-stream";
}

#ifndef LIVI_GST_HOST_STANDALONE
static std::string get_string_arg(napi_env env, napi_value v) {
  size_t len = 0;
  napi_get_value_string_utf8(env, v, NULL, 0, &len);
  std::string s(len, '\0');
  napi_get_value_string_utf8(env, v, &s[0], len + 1, &len);
  return s;
}

static napi_value Version(napi_env env, napi_callback_info info) {
  ensure_init();
  gchar* v = gst_version_string();
  napi_value result;
  napi_create_string_utf8(env, v, NAPI_AUTO_LENGTH, &result);
  g_free(v);
  return result;
}

// probeCodecs() -> { h264: {hw, sw}, h265: {...}, vp9, av1 }
// hw = a hardware decoder exists; sw = a software decoder exists
static napi_value ProbeCodecs(napi_env env, napi_callback_info info) {
  ensure_init();
  napi_value obj;
  napi_create_object(env, &obj);
  const char* codecs[] = {"h264", "h265", "vp9", "av1"};
  for (const char* c : codecs) {
    const char* dec = decoder_for(c);
    bool hw = factory_exists(dec) && is_hw_decoder(dec);
    bool sw = factory_exists(sw_decoder_for(c));

    napi_value entry, b;
    napi_create_object(env, &entry);
    napi_get_boolean(env, hw, &b);
    napi_set_named_property(env, entry, "hw", b);
    napi_get_boolean(env, sw, &b);
    napi_set_named_property(env, entry, "sw", b);
    napi_set_named_property(env, obj, c, entry);
  }
  return obj;
}
#endif

static void livi_free_player(Player* p) {
  if (!p) return;
  if (p->pipeline) {
    gst_element_set_state(p->pipeline, GST_STATE_NULL);
    if (p->appsrc) gst_object_unref(p->appsrc);
    if (p->sink) gst_object_unref(p->sink);
    gst_object_unref(p->pipeline);
  }
  remove_video_view(p);
  delete p;
}

#ifndef LIVI_GST_HOST_STANDALONE
static void player_finalize(napi_env env, void* data, void* hint) {
  (void)env;
  (void)hint;
  livi_free_player(static_cast<Player*>(data));
}
#endif

// createPlayer(codec: string, windowHandle: Buffer) -> external
// Build the decode + waylandsink pipeline for a codec. handle is the native window for the
// mac/Windows overlay, unused on Linux. Returns NULL on parse failure.
static Player* livi_create_player(const std::string& codec, guintptr handle) {
  // Live low-latency, two queues on purpose:
  //  - BEFORE the decoder: NON-leaky. A stateless HW decoder needs every
  //    encoded frame for its reference chain, dropping one corrupts the DPB
  //    and hangs the HW ("Request took too long"). The HW decodes far faster
  //    than realtime, so this queue stays near-empty and never needs to drop
  //  - AFTER the decoder: leaky=downstream. THIS is where live "stay current"
  //    dropping belongs: if the sink/compositor falls behind, drop DECODED
  //    frames to keep latency low and free the scarce zero-copy capture
  //    buffers, without ever breaking the reference chain
  const char* decoder = decoder_for(codec);

  std::string presink;
#if !defined(__APPLE__) && !defined(_WIN32)
  if (!is_hw_decoder(decoder)) presink = "videoconvert ! ";
#endif

  std::string desc = "appsrc name=src is-live=true do-timestamp=true format=time"
    " min-latency=0 max-latency=0 caps=" +
    caps_for(codec) + " ! " + parser_for(codec) +
    " ! queue max-size-buffers=0 max-size-bytes=0 max-size-time=2000000000" +
    " ! " + std::string(decoder) + " name=dec" +
    " ! queue max-size-buffers=2 max-size-bytes=0 max-size-time=0 leaky=downstream" +
    " ! " + presink + sink_chain();

  fprintf(stderr, "[gst_video] codec=%s decoder=%s | %s\n",
    codec.c_str(), decoder, desc.c_str());

  GError* err = nullptr;
  GstElement* pipeline = gst_parse_launch(desc.c_str(), &err);
  if (!pipeline || err) {
    fprintf(stderr, "[gst_video] pipeline parse FAILED: %s\n",
      err ? err->message : "unknown");
    if (err) g_error_free(err);
    if (pipeline) gst_object_unref(pipeline);
    return nullptr;
  }

  Player* p = new Player();
  p->pipeline = pipeline;
  p->appsrc = gst_bin_get_by_name(GST_BIN(pipeline), "src");
  p->sink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");

  force_sinks_realtime(pipeline);

  GstElement* dec = gst_bin_get_by_name(GST_BIN(pipeline), "dec");
  if (dec) {
    GstPad* sp = gst_element_get_static_pad(dec, "src");
    if (sp) {
      gst_pad_add_probe(sp, GST_PAD_PROBE_TYPE_EVENT_DOWNSTREAM, caps_probe, NULL, NULL);
      // Advertise GstVideoMeta in the decoder's ALLOCATION query so it exports
      // the cropped (1088->1080) frame as a dmabuf instead of copying. The
      // decoder queries its PEER pad in decide_allocation, and that peer is the
      // post-decoder queue (a queue does not forward allocation queries
      // synchronously), so the probe must sit on the peer pad, not on
      // waylandsink further downstream.
      GstPad* peer = gst_pad_get_peer(sp);
      if (peer) {
        gst_pad_add_probe(peer, GST_PAD_PROBE_TYPE_QUERY_DOWNSTREAM, alloc_meta_probe, NULL, NULL);
        gst_object_unref(peer);
      }
      gst_object_unref(sp);
    }
    gst_object_unref(dec);
  }

  if (p->sink) {
    GstPad* sp = gst_element_get_static_pad(p->sink, "sink");
    if (sp) {
      // DIAGNOSTIC (temporary): inspect the first buffer the sink receives.
      gst_pad_add_probe(sp, GST_PAD_PROBE_TYPE_BUFFER, buffer_probe, NULL, NULL);
      gst_object_unref(sp);
    }
  }

  GstBus* bus = gst_element_get_bus(pipeline);
  gst_bus_set_sync_handler(bus, bus_sync, NULL, NULL);
  gst_object_unref(bus);

  // mac/Windows embed the sink into the window surface (NSView/HWND). Linux runs
  // under livi-compositor, where waylandsink is its own client and gets its own
  // toplevel that the compositor lays under the UI; no handle embedding there.
#ifndef __linux__
  guintptr overlay = handle ? livi_attach_view(handle, &p->view) : handle;
  if (p->sink && GST_IS_VIDEO_OVERLAY(p->sink) && overlay) {
    gst_video_overlay_set_window_handle(GST_VIDEO_OVERLAY(p->sink), overlay);
  }
#else
  (void)handle;
#endif

  return p;
}

#ifndef LIVI_GST_HOST_STANDALONE
// createPlayer(codec: string, windowHandle: Buffer) -> external
static napi_value CreatePlayer(napi_env env, napi_callback_info info) {
  ensure_init();

  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  std::string codec = argc >= 1 ? get_string_arg(env, argv[0]) : "h264";

  guintptr handle = 0;
  if (argc >= 2) {
    void* data = nullptr;
    size_t len = 0;
    if (napi_get_buffer_info(env, argv[1], &data, &len) == napi_ok && data && len >= sizeof(void*)) {
      memcpy(&handle, data, sizeof(void*));
    }
  }

  Player* p = livi_create_player(codec, handle);
  if (!p) {
    napi_value n;
    napi_get_null(env, &n);
    return n;
  }
  napi_value ext;
  napi_create_external(env, p, player_finalize, NULL, &ext);
  return ext;
}

static Player* unwrap(napi_env env, napi_value v) {
  void* data = nullptr;
  napi_get_value_external(env, v, &data);
  return static_cast<Player*>(data);
}

static napi_value Start(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  Player* p = argc >= 1 ? unwrap(env, argv[0]) : nullptr;
  if (p && p->pipeline) gst_element_set_state(p->pipeline, GST_STATE_PLAYING);
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}
#endif

static void livi_push_player(Player* p, const void* data, size_t len) {
  if (!p || !p->appsrc || !data || len == 0) return;
  GstBuffer* buf = gst_buffer_new_memdup(data, len);
  gst_app_src_push_buffer(GST_APP_SRC(p->appsrc), buf);
}

#ifndef LIVI_GST_HOST_STANDALONE
// pushBuffer(player, buffer)
static napi_value PushBuffer(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  Player* p = argc >= 1 ? unwrap(env, argv[0]) : nullptr;

  void* data = nullptr;
  size_t len = 0;
  bool ok = p && p->appsrc && argc >= 2 &&
    napi_get_buffer_info(env, argv[1], &data, &len) == napi_ok && data && len > 0;
  if (ok) livi_push_player(p, data, len);

  napi_value result;
  napi_get_boolean(env, ok, &result);
  return result;
}

// setVisible(player, bool): show/hide the video view (UI navigation in/out)
static napi_value SetVisible(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  Player* p = argc >= 1 ? unwrap(env, argv[0]) : nullptr;
  bool visible = true;
  if (argc >= 2) napi_get_value_bool(env, argv[1], &visible);
  if (p) livi_set_view_hidden(p->view, !visible);
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}

static napi_value Stop(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  Player* p = argc >= 1 ? unwrap(env, argv[0]) : nullptr;
  if (p && p->pipeline) gst_element_set_state(p->pipeline, GST_STATE_NULL);
  if (p) remove_video_view(p);
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}

static napi_value SetContentRegion(napi_env env, napi_callback_info info) {
  size_t argc = 7;
  napi_value argv[7];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  Player* p = argc >= 1 ? unwrap(env, argv[0]) : nullptr;
  if (p && p->view) {
    auto d = [&](size_t idx) -> double {
      double v = 0;
      if (argc > idx) napi_get_value_double(env, argv[idx], &v);
      return v;
    };
    livi_set_content_region(p->view, p->sink, d(1), d(2), d(3), d(4), d(5), d(6));
  }
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}

// setBackdrop(windowHandle: Buffer, r, g, b)  -- r/g/b in 0..1. Paints the window's content
// view (under the video subviews) so the theme colour shows where the UI is transparent and no
// video covers, instead of the desktop.
static napi_value SetBackdrop(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value argv[4];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  guintptr handle = 0;
  if (argc >= 1) {
    void* data = nullptr;
    size_t len = 0;
    if (napi_get_buffer_info(env, argv[0], &data, &len) == napi_ok && data &&
        len >= sizeof(void*)) {
      memcpy(&handle, data, sizeof(void*));
    }
  }
  auto d = [&](size_t idx) -> double {
    double v = 0;
    if (argc > idx) napi_get_value_double(env, argv[idx], &v);
    return v;
  };
  if (handle) livi_set_backdrop(handle, d(1), d(2), d(3));
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}
#endif

#ifdef __linux__
// gst-host: on Linux x86-64 the pipeline runs in this separate process with a real GLib main loop
// on the pipeline's own thread, so waylandsink processes resize configures live (Node has no GLib
// loop). Reads create(1)/data(2)/stop(3) frames from the unix socket the main process serves.
struct LiviHost {
  GByteArray* buf;
  GHashTable* players;  // id -> Player*
};

static void livi_host_dispatch(LiviHost* h, guint8 op, guint32 id, const guint8* rest, gsize rlen) {
  gpointer key = GUINT_TO_POINTER(id);
  if (op == 1) {
    char codec[16];
    gsize n = rlen < sizeof(codec) - 1 ? rlen : sizeof(codec) - 1;
    memcpy(codec, rest, n);
    codec[n] = '\0';
    Player* old = (Player*)g_hash_table_lookup(h->players, key);
    if (old) {
      g_hash_table_remove(h->players, key);
      livi_free_player(old);
    }
    Player* p = livi_create_player(codec, 0);
    if (p) {
      gst_element_set_state(p->pipeline, GST_STATE_PLAYING);
      g_hash_table_insert(h->players, key, p);
    }
  } else if (op == 2) {
    livi_push_player((Player*)g_hash_table_lookup(h->players, key), rest, rlen);
  } else if (op == 3) {
    Player* p = (Player*)g_hash_table_lookup(h->players, key);
    if (p) {
      g_hash_table_remove(h->players, key);
      livi_free_player(p);
    }
  }
}

static gboolean livi_host_readable(gint fd, GIOCondition cond, gpointer data) {
  LiviHost* h = (LiviHost*)data;
  if (cond & (G_IO_HUP | G_IO_ERR)) exit(0);
  guint8 chunk[65536];
  ssize_t n = read(fd, chunk, sizeof(chunk));
  if (n <= 0) exit(0);
  g_byte_array_append(h->buf, chunk, (guint)n);
  while (h->buf->len >= 4) {
    guint32 len;
    memcpy(&len, h->buf->data, 4);
    if (h->buf->len < 4 + len) break;
    if (len >= 5) {
      guint8* payload = h->buf->data + 4;
      guint32 id;
      memcpy(&id, payload + 1, 4);
      livi_host_dispatch(h, payload[0], id, payload + 5, len - 5);
    }
    g_byte_array_remove_range(h->buf, 0, 4 + len);
  }
  return G_SOURCE_CONTINUE;
}

// Where to drop the crash backtrace (next to the AppImage); set in Run() before the handler arms.
static char g_crash_log_path[1024] = {0};

// On a fatal signal, write a resolved backtrace to stderr and to the crash log, then re-raise.
// Only async-signal-safe calls here (open/write/backtrace_symbols_fd).
static void livi_host_crash(int sig) {
  void* frames[64];
  int n = backtrace(frames, 64);
  const char hdr[] = "\n=== gst-host CRASH backtrace ===\n";
  (void)!write(STDERR_FILENO, hdr, sizeof(hdr) - 1);
  backtrace_symbols_fd(frames, n, STDERR_FILENO);
  if (g_crash_log_path[0]) {
    int cf = open(g_crash_log_path, O_CREAT | O_WRONLY | O_TRUNC, 0644);
    if (cf >= 0) {
      (void)!write(cf, hdr, sizeof(hdr) - 1);
      backtrace_symbols_fd(frames, n, cf);
      close(cf);
    }
  }
  signal(sig, SIG_DFL);
  raise(sig);
}

// Connect to the host socket and run the GLib main loop forever. Shared by the standalone
// gst-host binary and the napi run() wrapper. The standalone binary is the real fix on x86-64:
// running outside the Electron executable means system libwayland binds ffi_call to the system
// libffi it was built against, not Electron's bundled copy (whose ffi_cif ABI differs and
// corrupts the wayland event marshalling on resize, crashing in g_mutex_lock).
static void livi_host_main(const char* sockPath, const char* crashLogPath) {
  ensure_init();
  if (crashLogPath && crashLogPath[0])
    strncpy(g_crash_log_path, crashLogPath, sizeof(g_crash_log_path) - 1);
  signal(SIGSEGV, livi_host_crash);
  signal(SIGABRT, livi_host_crash);

  int fd = socket(AF_UNIX, SOCK_STREAM, 0);
  struct sockaddr_un addr;
  memset(&addr, 0, sizeof(addr));
  addr.sun_family = AF_UNIX;
  strncpy(addr.sun_path, sockPath, sizeof(addr.sun_path) - 1);
  if (fd < 0 || connect(fd, (struct sockaddr*)&addr, sizeof(addr)) != 0) {
    fprintf(stderr, "[gst-host] connect to %s failed\n", sockPath);
    exit(1);
  }

  LiviHost* h = new LiviHost();
  h->buf = g_byte_array_new();
  h->players = g_hash_table_new(g_direct_hash, g_direct_equal);
  g_unix_fd_add(fd, (GIOCondition)(G_IO_IN | G_IO_HUP | G_IO_ERR), livi_host_readable, h);

  fprintf(stderr, "[gst-host] ready, running main loop\n");
  g_main_loop_run(g_main_loop_new(NULL, FALSE));
}

#ifdef LIVI_GST_HOST_STANDALONE
// Standalone gst-host: argv[1]=socket path, argv[2]=crash log path.
int main(int argc, char** argv) {
  const char* sock = argc > 1 ? argv[1] : "";
  const char* crash = argc > 2 ? argv[2] : "";
  livi_host_main(sock, crash);
  return 0;
}
#else
// run(socketPath, crashLogPath): napi entry, forwards to livi_host_main.
static napi_value Run(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  std::string sockPath = argc >= 1 ? get_string_arg(env, argv[0]) : "";
  std::string crashPath = argc >= 2 ? get_string_arg(env, argv[1]) : "";
  livi_host_main(sockPath.c_str(), crashPath.c_str());
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}
#endif
#endif

#ifndef LIVI_GST_HOST_STANDALONE
static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, "version", NAPI_AUTO_LENGTH, Version, NULL, &fn);
  napi_set_named_property(env, exports, "version", fn);
  napi_create_function(env, "probeCodecs", NAPI_AUTO_LENGTH, ProbeCodecs, NULL, &fn);
  napi_set_named_property(env, exports, "probeCodecs", fn);
  napi_create_function(env, "createPlayer", NAPI_AUTO_LENGTH, CreatePlayer, NULL, &fn);
  napi_set_named_property(env, exports, "createPlayer", fn);
  napi_create_function(env, "start", NAPI_AUTO_LENGTH, Start, NULL, &fn);
  napi_set_named_property(env, exports, "start", fn);
  napi_create_function(env, "pushBuffer", NAPI_AUTO_LENGTH, PushBuffer, NULL, &fn);
  napi_set_named_property(env, exports, "pushBuffer", fn);
  napi_create_function(env, "setVisible", NAPI_AUTO_LENGTH, SetVisible, NULL, &fn);
  napi_set_named_property(env, exports, "setVisible", fn);
  napi_create_function(env, "setContentRegion", NAPI_AUTO_LENGTH, SetContentRegion, NULL, &fn);
  napi_set_named_property(env, exports, "setContentRegion", fn);
  napi_create_function(env, "setBackdrop", NAPI_AUTO_LENGTH, SetBackdrop, NULL, &fn);
  napi_set_named_property(env, exports, "setBackdrop", fn);
  napi_create_function(env, "stop", NAPI_AUTO_LENGTH, Stop, NULL, &fn);
  napi_set_named_property(env, exports, "stop", fn);
#ifdef __linux__
  napi_create_function(env, "run", NAPI_AUTO_LENGTH, Run, NULL, &fn);
  napi_set_named_property(env, exports, "run", fn);
#endif
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
#endif
