import { ZapIcon, SmartphoneIcon, WifiIcon, CreditCardIcon, WalletIcon, DollarSignIcon, PiggyBankIcon, TriangleAlertIcon, CheckCheckIcon, ShieldCheckIcon, BadgePercentIcon, ArrowLeftRightIcon, ShieldXIcon, PencilIcon, LoaderIcon, MessageCircleMoreIcon } from '@animateicons/react/lucide';
import { Home, ShoppingBag, Car, Coffee, HeartPulse, GraduationCap, Plane, Dumbbell, Gamepad, Gift, Scissors, Shirt, Watch, Music, Briefcase, Baby, HelpCircle, Building, Landmark, Bitcoin } from 'lucide-react';

interface CategoryIconProps {
    iconName: string;
    size?: number;
    className?: string;
}

const IconMap: Record<string, any> = {
    'Home': Home,
    'ShoppingBag': ShoppingBag,
    'Car': Car,
    'Coffee': Coffee,
    'Zap': ZapIcon,
    'HeartPulse': HeartPulse,
    'GraduationCap': GraduationCap,
    'Smartphone': SmartphoneIcon,
    'Plane': Plane,
    'Dumbbell': Dumbbell,
    'Gamepad': Gamepad,
    'Gift': Gift,
    'Scissors': Scissors,
    'Shirt': Shirt,
    'Watch': Watch,
    'Music': Music,
    'Wifi': WifiIcon,
    'CreditCard': CreditCardIcon,
    'Briefcase': Briefcase,
    'Baby': Baby,
    'Wallet': WalletIcon,
    'Building': Building,
    'Landmark': Landmark,
    'DollarSign': DollarSignIcon,
    'Bitcoin': Bitcoin,
    'PiggyBank': PiggyBankIcon
};

const LUCIDE_ICONS = new Set(['Home', 'ShoppingBag', 'Car', 'Coffee', 'HeartPulse', 'GraduationCap', 'Plane', 'Dumbbell', 'Gamepad', 'Gift', 'Scissors', 'Shirt', 'Watch', 'Music', 'Briefcase', 'Baby', 'Building', 'Landmark', 'Bitcoin']);

export function CategoryIcon({ iconName, size = 20, className }: CategoryIconProps) {
    const IconComponent = IconMap[iconName] || HelpCircle;
    const isLucide = LUCIDE_ICONS.has(iconName);
    const animClass = isLucide ? 'lucide-animated' : '';

    return <IconComponent size={size} className={`${animClass} ${className || ''}`.trim()} />;
}

export const AVAILABLE_ICONS = Object.keys(IconMap);
