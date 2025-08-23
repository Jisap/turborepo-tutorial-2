import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

type Props = {
  status: 'unresolved' | 'resolved' | 'escalated';
};

const statusConfig = {
  resolved: {
    bgColor: 'bg-[#3fb62f]',
    icon: CheckIcon,
  },
  unresolved: {
    bgColor: 'bg-destructive',
    icon: ArrowRightIcon,
  },
  escalated: {
    bgColor: 'bg-yellow-500',
    icon: ArrowUpIcon,
  },
} as const;

export default function ConversationStatusIcon({ status }: Props) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full size-5 shrink-0',
        config.bgColor
      )}
    >
      <Icon className="size-3 stroke-3 text-white" />
    </div>
  );
}