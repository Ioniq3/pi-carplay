import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import {
  name,
  description,
  version,
  author,
  contributors,
  homepage
} from '../../../../../../../../package.json'

export const About = () => {
  return (
    <>
      <Typography>{name}</Typography>
      <Typography>{description}</Typography>

      <List>
        <ListItem>
          <ListItemText primary="Version" secondary={version} />
          <ListItemText primary="Build Number" secondary={version} />
        </ListItem>

        <ListItem>
          <ListItemText primary="URL" secondary={homepage} />
        </ListItem>

        <ListItem>
          <ListItemText primary="Author" secondary={author} />
          <ListItemText primary="Contributors" secondary={contributors.join(', ')} />
        </ListItem>
      </List>
    </>
  )
}
