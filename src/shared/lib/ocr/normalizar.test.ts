import { aLineas, rutaParaOcr } from './normalizar';

describe('rutaParaOcr', () => {
  /**
   * El módulo de Android abre con `File(ruta)` todo lo que no sea
   * `content://`. Con el prefijo `file://` puesto, el archivo "no existe" y el
   * OCR falla en cada foto.
   */
  it('en Android quita el prefijo file://', () => {
    expect(
      rutaParaOcr('file:///data/user/0/mx.app/cache/ImagePicker/a.jpg', 'android'),
    ).toBe('/data/user/0/mx.app/cache/ImagePicker/a.jpg');
  });

  it('en Android decodifica los espacios de la ruta', () => {
    expect(rutaParaOcr('file:///data/mi%20foto.jpg', 'android')).toBe('/data/mi foto.jpg');
  });

  it('en Android deja las content:// como están', () => {
    const uri = 'content://media/external/images/media/42';
    expect(rutaParaOcr(uri, 'android')).toBe(uri);
  });

  /** En iOS el módulo recibe una URL, y la URI completa es lo que necesita. */
  it('en iOS no toca la URI', () => {
    const uri = 'file:///var/mobile/Containers/Data/tmp/a.jpg';
    expect(rutaParaOcr(uri, 'ios')).toBe(uri);
  });
});

describe('aLineas', () => {
  /** ML Kit devuelve bloques con varios renglones unidos con salto de línea. */
  it('parte los bloques en renglones', () => {
    expect(aLineas(['OXXO\nSUC. CENTRO', 'SUBTOTAL\nIVA\nTOTAL'])).toEqual([
      'OXXO',
      'SUC. CENTRO',
      'SUBTOTAL',
      'IVA',
      'TOTAL',
    ]);
  });

  it('acepta saltos de línea de Windows', () => {
    expect(aLineas(['A\r\nB'])).toEqual(['A', 'B']);
  });

  it('recorta espacios y descarta renglones vacíos', () => {
    expect(aLineas(['  TOTAL  \n\n  ', '   ', '$99.00'])).toEqual(['TOTAL', '$99.00']);
  });

  /** Apple Vision ya entrega un renglón por observación: pasa tal cual. */
  it('deja igual lo que ya viene renglón por renglón', () => {
    expect(aLineas(['OXXO', 'TOTAL 99.00'])).toEqual(['OXXO', 'TOTAL 99.00']);
  });

  it('sin bloques devuelve la lista vacía', () => {
    expect(aLineas([])).toEqual([]);
  });
});
