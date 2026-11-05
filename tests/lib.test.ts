import { describe, it, expect } from 'vitest';
import { phoneKey, formatPhoneBR, statusBucket, localDay } from '../src/lib/supabase';

describe('phoneKey', () => {
  it('usa os 8 últimos dígitos (ignora DDI, DDD, nono dígito e formatação)', () => {
    expect(phoneKey('+55 (63) 99965-3869')).toBe('99653869');
    expect(phoneKey('63 99965 3869')).toBe(phoneKey('+5563999653869'));
  });
  it('devolve vazio para números curtos', () => {
    expect(phoneKey('123')).toBe('');
  });
});

describe('formatPhoneBR', () => {
  it('formata celular com 11 dígitos', () => {
    expect(formatPhoneBR('63999653869')).toBe('+55 (63) 99965-3869');
  });
  it('aceita DDI 55', () => {
    expect(formatPhoneBR('5563999653869')).toBe('+55 (63) 99965-3869');
  });
  it('vazio continua vazio', () => {
    expect(formatPhoneBR('')).toBe('');
  });
});

describe('statusBucket', () => {
  it('agrupa os status do Clinicorp e do banco', () => {
    expect(statusBucket('attended')).toBe('attended');
    expect(statusBucket('Atendido')).toBe('attended');
    expect(statusBucket('cancelled')).toBe('cancelled');
    expect(statusBucket('Faltou')).toBe('missed');
    expect(statusBucket('confirmed')).toBe('confirmed');
    expect(statusBucket('pending')).toBe('pending');
    expect(statusBucket(undefined)).toBe('pending');
  });
});

describe('localDay', () => {
  it('mantém datas simples como estão', () => {
    expect(localDay('2026-10-13')).toBe('2026-10-13');
  });
  it('vazio vira string vazia', () => {
    expect(localDay(null)).toBe('');
  });
});
