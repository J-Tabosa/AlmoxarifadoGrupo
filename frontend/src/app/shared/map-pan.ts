import { Directive, ElementRef, HostListener, Input, OnDestroy, inject } from '@angular/core';

/** Desloca somente a área rolável do mapa. A seleção por clique continua disponível. */
@Directive({
    selector: '[appMapPan]',
    standalone: true
})
export class MapPan implements OnDestroy {
    @Input('appMapPan') leftEnabled = false;
    private readonly viewport = inject(ElementRef<HTMLElement>).nativeElement;
    private gesture: { id: number; button: number; x: number; y: number; left: number; top: number; moved: boolean } | null = null;
    private suppressClick = false;

    // Em captura, impede que o fim de um arraste selecione uma estante por acidente.
    private readonly captureClick = (event: MouseEvent) => {
        if (this.suppressClick && event.detail !== 0) {
            this.suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };

    constructor() { this.viewport.addEventListener('click', this.captureClick, true); }

    @HostListener('pointerdown', ['$event'])
    start(event: PointerEvent): void {
        if (this.gesture) return;
        this.suppressClick = false;
        if (event.button !== 1 && !(event.button === 0 && this.leftEnabled)) return;
        const rect = this.viewport.getBoundingClientRect();
        const x = event.clientX - rect.left - this.viewport.clientLeft;
        const y = event.clientY - rect.top - this.viewport.clientTop;
        // Deixa as barras de rolagem nativas utilizáveis.
        if (x < 0 || y < 0 || x >= this.viewport.clientWidth || y >= this.viewport.clientHeight) return;
        if (event.button === 1) event.preventDefault();
        this.gesture = { id: event.pointerId, button: event.button, x: event.clientX, y: event.clientY,
            left: this.viewport.scrollLeft, top: this.viewport.scrollTop, moved: false };
    }

    @HostListener('document:pointermove', ['$event'])
    move(event: PointerEvent): void {
        const g = this.gesture;
        if (!g || g.id !== event.pointerId) return;
        const mask = g.button === 1 ? 4 : 1;
        if (event.pointerType === 'mouse' && !(event.buttons & mask)) { this.end(event); return; }
        const dx = event.clientX - g.x, dy = event.clientY - g.y;
        if (!g.moved && Math.hypot(dx, dy) < 5) return;
        if (!g.moved) {
            g.moved = true;
            this.suppressClick = true;
            this.viewport.classList.add('map-panning');
            try { this.viewport.setPointerCapture(g.id); } catch { /* Pointer sintético ou encerrado. */ }
        }
        event.preventDefault();
        this.viewport.scrollLeft = g.left - dx;
        this.viewport.scrollTop = g.top - dy;
    }

    @HostListener('document:pointerup', ['$event'])
    @HostListener('document:pointercancel', ['$event'])
    @HostListener('lostpointercapture', ['$event'])
    end(event?: PointerEvent): void {
        const g = this.gesture;
        if (!g || (event && g.id !== event.pointerId)) return;
        this.gesture = null;
        this.viewport.classList.remove('map-panning');
        try { if (this.viewport.hasPointerCapture(g.id)) this.viewport.releasePointerCapture(g.id); } catch { }
    }

    @HostListener('window:blur')
    blur(): void { this.end(); }

    @HostListener('auxclick', ['$event'])
    auxClick(event: MouseEvent): void { if (event.button === 1) event.preventDefault(); }

    ngOnDestroy(): void {
        this.end();
        this.viewport.removeEventListener('click', this.captureClick, true);
    }
}
