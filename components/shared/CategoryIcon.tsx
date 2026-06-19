import {
    Home, ShoppingBag, Car, Coffee, Zap, HeartPulse, GraduationCap,
    Smartphone, Plane, Dumbbell, Gamepad, Gift, Scissors, Shirt,
    Watch, Music, Wifi, CreditCard, Briefcase, Baby, HelpCircle,
    Wallet, Building, Landmark, DollarSign, Bitcoin, PiggyBank
} from 'lucide-react';

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
    'Zap': Zap,
    'HeartPulse': HeartPulse,
    'GraduationCap': GraduationCap,
    'Smartphone': Smartphone,
    'Plane': Plane,
    'Dumbbell': Dumbbell,
    'Gamepad': Gamepad,
    'Gift': Gift,
    'Scissors': Scissors,
    'Shirt': Shirt,
    'Watch': Watch,
    'Music': Music,
    'Wifi': Wifi,
    'CreditCard': CreditCard,
    'Briefcase': Briefcase,
    'Baby': Baby,
    'Wallet': Wallet,
    'Building': Building,
    'Landmark': Landmark,
    'DollarSign': DollarSign,
    'Bitcoin': Bitcoin,
    'PiggyBank': PiggyBank
};

export function CategoryIcon({ iconName, size = 20, className }: CategoryIconProps) {
    const IconComponent = IconMap[iconName] || HelpCircle;

    return <IconComponent size={size} className={className} />;
}

export const AVAILABLE_ICONS = Object.keys(IconMap);
