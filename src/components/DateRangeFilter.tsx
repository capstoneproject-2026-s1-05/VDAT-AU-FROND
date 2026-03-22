import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown } from 'lucide-react';

/**
 * 时间预设类型
 * '7d' = 最近7天, '14d' = 最近14天, 以此类推
 * 'season' = 整个赛季, 'custom' = 自定义日期范围
 */
export type TimePreset = '7d' | '14d' | '30d' | '90d' | 'season' | 'custom';

/** 日期范围对象 */
export interface DateRange {
  from: Date;
  to: Date;
  preset: TimePreset;
  label: string;
}

/** 预设选项配置 */
const presets: { value: TimePreset; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 Days', days: 7 },
  { value: '14d', label: 'Last 14 Days', days: 14 },
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: '90d', label: 'Last 90 Days', days: 90 },
  { value: 'season', label: 'Full Season', days: 365 },
];

/** 获取默认的日期范围（最近 30 天） */
export function getDefaultDateRange(): DateRange {

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to, preset: '30d', label: 'Last 30 Days' };
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const handlePreset = (preset: (typeof presets)[number]) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - preset.days);
    onChange({ from, to, preset: preset.value, label: preset.label });
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* 触发按钮：显示当前选中的时间范围 */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-border hover:bg-secondary"
        onClick={() => setOpen(!open)}
      >
        <Calendar className="w-3 h-3" />
        {value.label}
        <ChevronDown className="w-3 h-3" />
      </Button>

      {/* 下拉面板：预设选项列表 */}
      {open && (
        <>
          {/* 点击外部关闭 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-secondary border border-border rounded-lg shadow-xl p-1 min-w-[160px]">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePreset(preset)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                  value.preset === preset.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}