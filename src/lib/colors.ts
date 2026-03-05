/**
 * Colores de la aplicación Base de Datos de Publicadores
 * Paleta de colores definida con códigos hex específicos
 */

// ========================================
// CÓDIGOS HEXADECIMALES DE COLORES
// ========================================

export const COLORS = {
  // Fondo principal
  BACKGROUND: '#0D0D0D',        // Negro
  
  // Encabezado
  HEADER: '#E36601',            // Naranja
  
  // Fondos de tarjetas y tablas
  CARD_BG: '#403C3B',          // Gris claro
  
  // Texto
  TEXT_WHITE: '#FFFFFF',           // Blanco
  
  // Botones
  BUTTON_LIGHT: '#8E0C6',       // Azul claro
  BUTTON_DARK: '#2E486A',       // Azul oscuro (hover)
  
  // Exportar
  EXPORT: '#E36601',            // Naranja (igual al encabezado)
} as const;

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

/**
 * Verifica si un color es válido
 * @param color - Código hex del color
 * @returns true si el color es válido
 */
export const isValidColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1}[0-9A-Fa-f]{3})$/i.test(color);
};

/**
 * Obtiene el color de fondo basado en el modo (opcional)
 * @param darkMode - Modo oscuro (true/false)
 * @returns Código del color de fondo
 */
export const getBackgroundColor = (darkMode: boolean = false): string => {
  return darkMode ? '#1F1F1F' : COLORS.BACKGROUND;
};

export default COLORS;
