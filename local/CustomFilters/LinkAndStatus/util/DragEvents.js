"use strict";

export class DragController {
  constructor(container) {
    this.container = container;
    this.preventDragging = false;
    this.dragElements = new Map();
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.initialize();
    this.setInitialPosition();
  }

  initialize() {
    const elementTypes = ['input', 'select', 'a'];
    elementTypes.forEach(type => {
      const elements = Array.from(this.container.getElementsByTagName(type));
      this.dragElements.set(type, elements);
      
      elements.forEach(element => {
        this.setupPreventDragEvents(element);
      });
    });

    this.setupContainerDrag();
  }

  setupPreventDragEvents(element) {
    element.addEventListener('mouseover', () => {
      this.preventDragging = true;
    });

    element.addEventListener('mouseleave', () => {
      this.preventDragging = false;
    });
  }

  setupContainerDrag() {
    this.container.addEventListener('pointerdown', (event) => {
      this.offsetX = event.clientX - this.container.offsetLeft;
      this.offsetY = event.clientY - this.container.offsetTop;
      this.container.setPointerCapture(event.pointerId);
    });

    this.container.addEventListener('pointermove', (event) => {
      if (event.buttons && !this.preventDragging) {
        this.handleDrag(event);
      }
    });

    this.container.addEventListener('pointerup', (event) => {
      if (this.container.hasPointerCapture(event.pointerId)) {
        this.container.releasePointerCapture(event.pointerId);
      }
    });
  }

  handleDrag(event) {
    try {
      const moveX = event.clientX - this.offsetX;
      const moveY = event.clientY - this.offsetY;

      this.container.style.position = 'absolute';
      this.container.style.left = `${moveX}px`;
      this.container.style.top = `${moveY}px`;
    } catch (error) {
      window.handleError('DragController', 'handleDrag', error);
    }
  }

  setInitialPosition() {
    try {
      const top = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerY") + 100;
      const left = window.cc.MainVideoPlayerWidthHeightReturner("MainContainerRight") + 500;

      this.container.style.position = 'absolute';
      this.container.style.top = `${top}px`;
      this.container.style.left = `${left}px`;

      window.debugLog('DragController', 'setInitialPosition', '初期位置設定完了');
    } catch (error) {
      window.handleError('DragController', 'setInitialPosition', error);
    }
  }

  updatePosition() {
    this.setInitialPosition();
  }
} 