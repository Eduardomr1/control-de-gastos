# Checklist de PR

Antes de pedir revisión, confirma cada punto. El lint de fronteras (Fase 5) ya
bloquea el merge si alguno de los primeros tres falla; los demás no los cubre
ninguna herramienta.

- [ ] **Feature correcto.** El código vive bajo el feature al que pertenece
      semánticamente, no en el primero que estaba a la mano.
- [ ] **Import por barrel.** Ningún archivo fuera de un feature importa su
      ruta interna (`api/`, `store/`, `screens/`, `components/`, `hooks/`).
      Solo `@/features/<nombre>`.
- [ ] **Un archivo, una responsabilidad.** Si un componente exportado
      necesita explicarse con "y también", se parte.
- [ ] **Error traducido a `Failure`.** Ningún `throw new Error(...)` con un
      mensaje del backend pegado encima. La capa de datos traduce; la
      pantalla decide el copy.
- [ ] **Componente del design system.** Texto, botón y campo usan `GTexto`,
      `GBoton`, `GCampo` — no `Text`/`Pressable`/`TextInput` crudos con estilo
      repetido.
- [ ] **Estado de carga por `GAsyncGate`.** Ninguna pantalla con datos
      async renderiza parcialmente mientras algo sigue `isPending`.
- [ ] **Prueba agregada.** Lógica nueva con rama o condición trae su
      prueba. Un hook de React que no se puede probar en Node (ver
      `jest.config.js`) se verifica en un flujo de `.maestro/`.
