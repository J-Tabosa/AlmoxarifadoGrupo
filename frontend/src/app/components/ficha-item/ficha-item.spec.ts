import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FichaItem } from './ficha-item';

describe('Atalhos da ficha do item', () => {
  it('aciona os botões existentes com I e O e respeita os bloqueios', async () => {
    await TestBed.configureTestingModule({ imports: [FichaItem], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(FichaItem);
    fixture.componentRef.setInput('grupoKey', 'central');
    fixture.componentRef.setInput('idEstante', 1);
    fixture.componentRef.setInput('prateleira', 1);
    fixture.componentRef.setInput('posicao', 2);
    const item = {
      idItem: 3, idCategoria: 1, descricaoItem: 'Detergente', unidade: 'UN', statusIt: 'A',
      estoques: [{ idItem: 3, idLocalizacao: 9, saldo: 4, eMinimo: 1, eMaximo: 10,
        localizacao: { idLocalizacao: 9, sala: 'Depósito', andar: '', statusL: 'A', posicao: 'P1 / Pos. 2',
          grupoKey: 'central', idEstante: 1, prateleira: 1, posicaoInterna: 2 } }]
    };
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
    const entrada = fixture.nativeElement.querySelector('.ficha-entrada') as HTMLButtonElement;
    const saida = fixture.nativeElement.querySelector('.ficha-saida') as HTMLButtonElement;
    let entradas = 0, saidas = 0;
    entrada.addEventListener('click', e => { e.stopImmediatePropagation(); entradas++; }, true);
    saida.addEventListener('click', e => { e.stopImmediatePropagation(); saidas++; }, true);
    const pressionar = (key: string, ctrlKey = false) => {
      const e = new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(pressionar('I')).toBe(true);
    expect(pressionar('o')).toBe(true);
    expect(pressionar('i', true)).toBe(false);
    expect(entradas).toBe(1);
    expect(saidas).toBe(1);
    fixture.componentRef.setInput('item', { ...item, estoques: [{ ...item.estoques[0], saldo: 0 }] });
    fixture.detectChanges();
    expect(saida.disabled).toBe(true);
    expect(pressionar('O')).toBe(false);
    expect(saidas).toBe(1);
  });
});
