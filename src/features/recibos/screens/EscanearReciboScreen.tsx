import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nowLocalIso } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { leerLineas, ocrDisponible } from '@/shared/lib/ocr';
import { colores } from '@/shared/theme/colores';
import { controlSize, scaledSize } from '@/shared/theme/tipografia';
import { GBoton, GTexto } from '@/shared/ui';
import { leerRecibo, type DatosDeRecibo } from '../parser';

/**
 * Pantalla de captura y lectura de recibos (Fase 8).
 *
 * El procesamiento corre on-device (ML Kit en Android, Vision en iOS) a través
 * de `shared/lib/ocr` y `features/recibos/parser`. Ninguna foto sale del
 * dispositivo y no hay llamadas a la nube.
 *
 * Permite tomar foto con la cámara o elegir una imagen de la galería, extrae
 * total, fecha y comercio con tolerancia a ruido de OCR, y transfiere los
 * datos reconocidos a AgregarScreen para su confirmación y guardado.
 */
export function EscanearReciboScreen() {
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datosRecibo, setDatosRecibo] = useState<DatosDeRecibo | null>(null);

  async function procesarFoto(uri: string) {
    setImagenUri(uri);
    setCargando(true);
    setError(null);

    try {
      if (!ocrDisponible) {
        setError('El reconocimiento de texto no está soportado en esta plataforma.');
        setCargando(false);
        return;
      }

      const lineas = await leerLineas(uri);
      const hoy = nowLocalIso().slice(0, 10);
      const resultado = leerRecibo(lineas, hoy);
      setDatosRecibo(resultado);
    } catch {
      setError(
        'No se pudo extraer el texto de la imagen. Puedes intentar con otra foto o registrar el gasto a mano.',
      );
    } finally {
      setCargando(false);
    }
  }

  async function tomarFoto() {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setError('Se requiere permiso de la cámara para fotografiar el recibo.');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!resultado.canceled && resultado.assets[0]?.uri) {
        await procesarFoto(resultado.assets[0].uri);
      }
    } catch {
      setError('Ocurrió un error al abrir la cámara.');
    }
  }

  async function elegirDeGaleria() {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setError('Se requiere permiso para acceder a tus fotos.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!resultado.canceled && resultado.assets[0]?.uri) {
        await procesarFoto(resultado.assets[0].uri);
      }
    } catch {
      setError('Ocurrió un error al seleccionar la imagen.');
    }
  }

  function usarDatos() {
    const totalFormateado =
      datosRecibo?.totalCents !== null && datosRecibo?.totalCents !== undefined
        ? (datosRecibo.totalCents / 100).toFixed(2)
        : '';

    router.replace({
      pathname: '/add',
      params: {
        ...(totalFormateado ? { amount: totalFormateado } : {}),
        ...(datosRecibo?.comercio ? { note: datosRecibo.comercio } : {}),
        ...(datosRecibo?.fecha ? { fecha: datosRecibo.fecha } : {}),
        ...(imagenUri ? { reciboUri: imagenUri } : {}),
      },
    });
  }

  function reintentar() {
    setImagenUri(null);
    setDatosRecibo(null);
    setError(null);
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-escanear-recibo"
    >
      {/* Encabezado modal */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colores.borde,
        }}
      >
        <Pressable
          testID="btn-cancelar"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
            Cancelar
          </GTexto>
        </Pressable>

        <GTexto variante="label" style={{ fontWeight: '600' }}>
          Escanear recibo
        </GTexto>

        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estado 1: Inicial (sin foto todavía) */}
        {!imagenUri && !cargando && (
          <View style={{ gap: 24, alignItems: 'center', paddingVertical: 20 }}>
            <View
              style={{
                width: controlSize(80),
                height: controlSize(80),
                borderRadius: controlSize(80) / 2,
                backgroundColor: colores.superficie,
                borderWidth: 1,
                borderColor: colores.borde,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GTexto style={{ fontSize: scaledSize(36) }}>🧾</GTexto>
            </View>

            <View style={{ gap: 8, alignItems: 'center' }}>
              <GTexto variante="titulo" style={{ textAlign: 'center' }}>
                Lectura de tickets y recibos
              </GTexto>
              <GTexto
                variante="body"
                color={colores.textoSecundario}
                style={{ textAlign: 'center', maxWidth: 320 }}
              >
                Toma una foto o selecciona una imagen de tu recibo para leer el
                monto total, fecha y comercio automáticamente.
              </GTexto>
            </View>

            {error && (
              <View
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: colores.error,
                }}
                testID="error-escaner"
              >
                <GTexto variante="caption" color={colores.error} style={{ textAlign: 'center' }}>
                  {error}
                </GTexto>
              </View>
            )}

            <View style={{ width: '100%', gap: 12, paddingTop: 12 }}>
              <GBoton
                testID="btn-tomar-foto"
                label="Tomar foto con cámara"
                onPress={tomarFoto}
                accessibilityLabel="Tomar foto con la cámara"
              />

              <Pressable
                testID="btn-elegir-galeria"
                accessibilityRole="button"
                accessibilityLabel="Elegir foto de la galería"
                onPress={elegirDeGaleria}
                style={{
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colores.borde,
                  backgroundColor: colores.superficie,
                  paddingHorizontal: 20,
                }}
              >
                <GTexto color={colores.texto} style={{ fontWeight: '600' }}>
                  Elegir de la galería
                </GTexto>
              </Pressable>
            </View>

            <GTexto
              variante="caption"
              color={colores.textoSecundario}
              style={{ textAlign: 'center', marginTop: 10 }}
            >
              Procesamiento 100% en el dispositivo · Sin costo ni envío a la nube
            </GTexto>
          </View>
        )}

        {/* Estado 2: Leyendo imagen */}
        {cargando && (
          <View
            style={{
              paddingVertical: 48,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
            testID="cargando-ocr"
          >
            <ActivityIndicator size="large" color={colores.acento} />
            <GTexto variante="label" style={{ fontWeight: '600' }}>
              Leyendo recibo en el dispositivo…
            </GTexto>
            <GTexto
              variante="caption"
              color={colores.textoSecundario}
              style={{ textAlign: 'center', maxWidth: 280 }}
            >
              Extrayendo total, fecha y comercio de la imagen
            </GTexto>
          </View>
        )}

        {/* Estado 3: Resultado del OCR obtenido */}
        {!cargando && datosRecibo && imagenUri && (
          <View style={{ gap: 20 }} testID="card-resultado-ocr">
            {/* Vista previa de miniatura */}
            <View
              style={{
                alignItems: 'center',
                backgroundColor: colores.superficie,
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: colores.borde,
              }}
            >
              <Image
                source={{ uri: imagenUri }}
                style={{
                  width: '100%',
                  minHeight: 180,
                  borderRadius: 12,
                  resizeMode: 'cover',
                }}
                accessibilityLabel="Vista previa del recibo escaneado"
              />
            </View>

            {/* Datos detectados */}
            <View
              style={{
                backgroundColor: colores.superficie,
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: colores.borde,
                gap: 14,
              }}
            >
              <GTexto variante="eyebrow" color={colores.textoSecundario}>
                Datos detectados
              </GTexto>

              {/* Total */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: colores.borde,
                }}
              >
                <GTexto variante="body" color={colores.textoSecundario}>
                  Total
                </GTexto>
                <GTexto
                  variante="titulo"
                  color={datosRecibo.totalCents !== null ? colores.acento : colores.textoSecundario}
                  testID="texto-total-detectado"
                >
                  {datosRecibo.totalCents !== null
                    ? formatMoney(datosRecibo.totalCents)
                    : 'No detectado'}
                </GTexto>
              </View>

              {/* Comercio */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: colores.borde,
                }}
              >
                <GTexto variante="body" color={colores.textoSecundario}>
                  Comercio
                </GTexto>
                <GTexto
                  variante="body"
                  color={datosRecibo.comercio ? colores.texto : colores.textoSecundario}
                  style={{ fontWeight: '600' }}
                  testID="texto-comercio-detectado"
                >
                  {datosRecibo.comercio ?? 'No detectado'}
                </GTexto>
              </View>

              {/* Fecha */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <GTexto variante="body" color={colores.textoSecundario}>
                  Fecha
                </GTexto>
                <GTexto
                  variante="body"
                  color={datosRecibo.fecha ? colores.texto : colores.textoSecundario}
                  style={{ fontWeight: '600' }}
                  testID="texto-fecha-detectada"
                >
                  {datosRecibo.fecha ?? 'Hoy'}
                </GTexto>
              </View>
            </View>

            <GTexto
              variante="caption"
              color={colores.textoSecundario}
              style={{ textAlign: 'center' }}
            >
              Revisa los datos antes de continuar. Podrás editarlos y elegir la
              categoría en el siguiente paso.
            </GTexto>

            {/* Acciones */}
            <View style={{ gap: 10, paddingTop: 4 }}>
              <GBoton
                testID="btn-usar-datos"
                label="Usar estos datos en nuevo gasto"
                onPress={usarDatos}
                accessibilityLabel="Continuar a registrar gasto con los datos leídos"
              />

              <Pressable
                testID="btn-reintentar"
                accessibilityRole="button"
                accessibilityLabel="Escanear otra foto"
                onPress={reintentar}
                style={{
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GTexto variante="caption" color={colores.acento} style={{ fontWeight: '600' }}>
                  Escanear otra foto
                </GTexto>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
