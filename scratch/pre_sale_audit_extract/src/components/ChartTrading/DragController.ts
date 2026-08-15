export type DragTargetType = 'sl' | 'tp' | 'entry' | 'pending';

export interface DragState {
  isDragging: boolean;
  targetType: DragTargetType | null;
  startPrice: number;
  currentPrice: number;
  screenX: number;
  screenY: number;
}

export class DragController {
  private state: DragState = {
    isDragging: false,
    targetType: null,
    startPrice: 0,
    currentPrice: 0,
    screenX: 0,
    screenY: 0,
  };

  private yToPrice: (y: number) => number;
  private onDragUpdate: (state: DragState) => void;
  private onDragEnd: (state: DragState) => void;

  constructor(
    yToPrice: (y: number) => number,
    onDragUpdate: (state: DragState) => void,
    onDragEnd: (state: DragState) => void
  ) {
    this.yToPrice = yToPrice;
    this.onDragUpdate = onDragUpdate;
    this.onDragEnd = onDragEnd;
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  public startDrag(type: DragTargetType, startPrice: number, e: MouseEvent): void {
    this.state = {
      isDragging: true,
      targetType: type,
      startPrice,
      currentPrice: startPrice,
      screenX: e.clientX,
      screenY: e.clientY,
    };

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.onDragUpdate(this.state);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.state.isDragging) return;

    const newPrice = this.yToPrice(e.clientY);
    this.state = {
      ...this.state,
      currentPrice: newPrice,
      screenX: e.clientX,
      screenY: e.clientY,
    };

    this.onDragUpdate(this.state);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.state.isDragging) return;

    const finalState = { ...this.state };
    this.cancelDrag();
    this.onDragEnd(finalState);
  }

  public cancelDrag(): void {
    this.state = {
      isDragging: false,
      targetType: null,
      startPrice: 0,
      currentPrice: 0,
      screenX: 0,
      screenY: 0,
    };
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  public getState(): DragState {
    return this.state;
  }
}
