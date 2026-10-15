// icons drawn for a line that starts on the left, mirrored in a right to left menu
const MIRRORED_ICONS: readonly string[] = ['align_start', 'align_end', 'indent', 'outdent', 'bullet_list', 'task_list'];

export const isMirroredIcon = (name: string): boolean => MIRRORED_ICONS.includes(name);

export default isMirroredIcon;
