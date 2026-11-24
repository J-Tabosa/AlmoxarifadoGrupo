import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Saidas } from './saidas';

describe('Saidas', () => {
  let component: Saidas;
  let fixture: ComponentFixture<Saidas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Saidas],
    }).compileComponents();

    fixture = TestBed.createComponent(Saidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
