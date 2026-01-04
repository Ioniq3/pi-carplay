import { styled } from '@mui/material/styles'
import Paper from '@mui/material/Paper'
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined'
import { StackItemProps } from '../../type'

const Item = styled(Paper)(({ theme }) => {
  const activeColor = theme.palette.primary.main

  return {
    ...theme.typography.body2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '3rem',
    flexDirection: 'row',
    paddingRight: theme.spacing(2),
    borderBottom: `2px solid ${theme.palette.divider}`,

    '& svg': {
      position: 'relative',
      right: 0,
      transition: 'all 0.3s ease-in-out'
    },

    '&:hover': {
      borderBottom: `2px solid ${activeColor}`,
      a: {
        color: activeColor
      },
      svg: {
        right: '3px',
        color: activeColor
      }
    },
    '&:active': {
      borderBottom: `2px solid ${activeColor}`,
      a: {
        color: activeColor
      },
      svg: {
        right: '3px',
        color: activeColor
      }
    },
    '&:focus': {
      borderBottom: `2px solid ${activeColor}`,
      a: {
        color: activeColor
      },
      svg: {
        right: '3px',
        color: activeColor
      }
    },

    ...theme.applyStyles('dark', {
      backgroundColor: 'transparent'
    }),
    '& > p': {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: theme.spacing(2),
      textDecoration: 'none',
      fontSize: '1rem',
      outline: 'none',
      color: theme.palette.text.secondary
    },
    '& > a': {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: theme.spacing(2),
      textDecoration: 'none',
      fontSize: '1rem',
      outline: 'none',
      color: theme.palette.text.secondary,

      // TODO duplicate - need to resolve with keyboard navigation
      '&:hover': {
        color: activeColor,

        '+ svg': {
          right: '3px',
          color: activeColor
        }
      },
      '&:active': {
        color: activeColor,

        '+ svg': {
          right: '3px',
          color: activeColor
        }
      },
      '&:focus': {
        color: activeColor,

        '+ svg': {
          right: '3px',
          color: activeColor
        }
      }
    }
  }
})

export const StackItem = ({
  children,
  value,
  node,
  showValue,
  withForwardIcon,
  onClick
}: StackItemProps) => {
  const viewValue = node?.valueTransform?.toView ? node?.valueTransform.toView(value) : value

  let displayValue = node?.valueTransform?.format
    ? node.valueTransform.format(viewValue)
    : `${viewValue}${node?.displayValueUnit ?? ''}`

  if (node?.type === 'select') {
    const option = node?.options.find((o) => o.value === value)

    displayValue = option?.label || ''
  }

  // TODO Fix me
  if (displayValue === 'null' || displayValue === 'undefined') {
    displayValue = '---'
  }

  return (
    <Item onClick={onClick}>
      {children}
      {showValue && (value || displayValue) && (
        <div style={{ whiteSpace: 'nowrap' }}>{displayValue}</div>
      )}
      {withForwardIcon && <ArrowForwardIosOutlinedIcon sx={{ color: 'inherit' }} />}
    </Item>
  )
}
