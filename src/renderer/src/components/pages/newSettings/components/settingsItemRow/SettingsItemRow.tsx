// import { Link, useNavigate } from 'react-router-dom'
import { Typography, Switch, Checkbox } from '@mui/material'
import { StackItem } from '../stackItem'
// import { SettingsItemRowProps } from './types'
import { ReactNode } from 'react'

type Props = {
  label: string
  children?: ReactNode
}

export const SettingsItemRow = ({ label, children }: Props) => {
  return (
    <StackItem>
      <Typography>{label}</Typography>
      {children}
    </StackItem>
  )
}

// export const SettingsItemRow2 = <T extends Record<string, any>, K extends keyof T>({
//   config,
//   item,
//   state,
//   transformer,
//   onClick,
//   onChange
// }: SettingsItemRowProps<T, K>) => {
//   const navigate = useNavigate()
//   const cfg = config[item]
//
//   const isItemRoute = cfg.type === 'route' && !!cfg.path
//
//   if (isItemRoute) {
//     const handleClick = () => {
//       if (cfg.path) {
//         navigate(cfg.path)
//       }
//     }
//     return (
//       <StackItem value={state[item]} onClick={handleClick} withForwardIcon>
//         <Link
//           style={{
//             pointerEvents: 'none'
//           }}
//           to={cfg.path as string}
//         >
//           {cfg.label}
//         </Link>
//       </StackItem>
//     )
//   }
//
//   let isClickable = true
//
//   const controlledElement = () => {
//     switch (config[item].type) {
//       case 'toggle':
//         return Switch
//       case 'checkbox':
//         return Checkbox
//       default:
//         isClickable = false
//         return Typography
//     }
//   }
//
//   const Element = controlledElement()
//
//   let isChecked = !!state[item]
//
//   if (transformer) {
//     isChecked = transformer()
//   }
//
//   return (
//     <StackItem onClick={onClick}>
//       <Typography>{config[item].label}</Typography>
//
//       <Element
//         checked={isChecked}
//         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//           onChange(item, e.target.checked as T[K])
//         }
//         slotProps={{ input: { 'aria-label': String(item) } }}
//         style={{
//           justifyContent: 'flex-end',
//           pointerEvents: isClickable ? 'auto' : 'none'
//         }}
//       >
//         {state[item]}
//       </Element>
//     </StackItem>
//   )
// }
