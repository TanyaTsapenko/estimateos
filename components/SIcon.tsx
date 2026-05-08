import {
  ArrowLeft, ChevronRight, ChevronDown,
  Building2, Users, Receipt, Tag, FileText, Lock, CreditCard, User, LogOut,
  Save, Check, Settings, Bell, Globe, Menu, X, Plus, Trash2, Download,
  AlertTriangle, Eye, EyeOff, ExternalLink, MoreHorizontal, Zap, Moon,
  Mail, Link2, PenLine, FileDown, Send, Copy, Share2,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const MAP = {
  'back':       ArrowLeft,
  'chevron-r':  ChevronRight,
  'chevron-d':  ChevronDown,
  'company':    Building2,
  'team':       Users,
  'invoice':    Receipt,
  'price':      Tag,
  'contract':   FileText,
  'lock':       Lock,
  'card':       CreditCard,
  'user':       User,
  'logout':     LogOut,
  'save':       Save,
  'check':      Check,
  'settings':   Settings,
  'bell':       Bell,
  'globe':      Globe,
  'menu':       Menu,
  'x':          X,
  'plus':       Plus,
  'trash':      Trash2,
  'download':   Download,
  'alert':      AlertTriangle,
  'eye':        Eye,
  'eye-off':    EyeOff,
  'external':   ExternalLink,
  'more':       MoreHorizontal,
  'zap':        Zap,
  'moon':       Moon,
  'mail':       Mail,
  'link':       Link2,
  'pen':        PenLine,
  'pdf':        FileDown,
  'send':       Send,
  'copy':       Copy,
  'share':      Share2,
} as const

export type IconName = keyof typeof MAP

interface SIconProps extends Omit<LucideProps, 'ref'> {
  name: IconName
}

export function SIcon({ name, size = 16, strokeWidth = 1.8, ...rest }: SIconProps) {
  const Icon = MAP[name]
  return <Icon size={size} strokeWidth={strokeWidth} {...rest} />
}
