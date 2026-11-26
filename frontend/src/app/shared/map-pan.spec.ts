import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MapPan } from './map-pan';

@Component({
    imports: [MapPan],
    template: '<div [appMapPan]="left"><button (click)="clicks = clicks + 1">Estante</button></div>'
})
class Host {
    left = true;
    clicks = 0;
}

describe('MapPan', () => {
    it('arrasta nos dois eixos e não seleciona a estante no fim', () => {
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const viewport = fixture.nativeElement.querySelector('div') as HTMLElement;
        const tile = viewport.querySelector('button')!;
        Object.defineProperties(viewport, {
            clientWidth: { value: 200 }, clientHeight: { value: 200 },
            scrollLeft: { value: 100, writable: true }, scrollTop: { value: 100, writable: true }
        });
        viewport.getBoundingClientRect = () => new DOMRect(0, 0, 200, 200);
        const down = (button: number) => tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button, pointerId: 1, clientX: 80, clientY: 80 }));
        const move = (buttons: number) => document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons, pointerType: 'mouse', pointerId: 1, clientX: 50, clientY: 40, cancelable: true }));
        const up = () => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

        down(0); move(1);
        expect(viewport.scrollLeft).toBe(130);
        expect(viewport.scrollTop).toBe(140);
        expect(viewport.classList.contains('map-panning')).toBe(true);
        up();
        tile.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
        expect(fixture.componentInstance.clicks).toBe(0);

        down(0); up();
        tile.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
        expect(fixture.componentInstance.clicks).toBe(1);

        fixture.componentInstance.left = false;
        fixture.detectChanges();
        down(0); move(1); up();
        expect(viewport.scrollLeft).toBe(130);
        down(1); move(4); up();
        expect(viewport.scrollLeft).toBe(160);
        expect(viewport.scrollTop).toBe(180);
    });
});
