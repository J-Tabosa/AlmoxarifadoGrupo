import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [provideRouter([])]
        }).compileComponents();
    });

    it('deve criar a aplicação', () => {
        const fixture = TestBed.createComponent(App);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('deve renderizar o layout principal', async () => {
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        await fixture.whenStable();
        const layout = fixture.nativeElement as HTMLElement;
        expect(layout.querySelector('.chrome')?.textContent).toContain('Gestão de Materiais');
        expect(layout.querySelector('.ribbon')).toBeTruthy();
        expect(layout.querySelector('router-outlet')).toBeTruthy();
    });
});
