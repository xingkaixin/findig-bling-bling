import type { StepStatus } from './types';

const statusLabelMap: Record<StepStatus, string> = {
  success: '成功',
  error: '失败',
  warning: '警告',
  running: '运行中',
  pending: '待执行',
  not_executed: '未执行',
  stopped: '已停止'
};

export function statusToLabel(status: StepStatus): string {
  return statusLabelMap[status] ?? status;
}

export function statusClassName(status: StepStatus): string {
  switch (status) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'running':
      return 'running';
    case 'stopped':
      return 'stopped';
    default:
      return 'pending';
  }
}
