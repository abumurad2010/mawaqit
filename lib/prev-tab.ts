let _previousTab = 'index';

export function setPreviousTab(name: string): void {
  _previousTab = name;
}

export function getPreviousTab(): string {
  return _previousTab;
}
