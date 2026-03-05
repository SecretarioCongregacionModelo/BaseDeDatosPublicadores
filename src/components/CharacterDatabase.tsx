'use client';

// Importamos React y los hooks necesarios para el manejo de estado
import React, { useState, useEffect } from 'react';
// Importamos los iconos de la librería lucide-react
import { Search, User, Plus, Download, Edit, Trash2, BarChart3, Calendar, Loader2, PieChart, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from './AuthGuard';

// Componente principal de la base de datos de publicadores
const CharacterDatabase = () => {
  const router = useRouter();

  // Auth Check
  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      router.push('/login');
    }
  }, []);

  // ========================================
  // ESTADOS DEL COMPONENTE
  // ========================================
  // ESTADOS DEL COMPONENTE
  // ========================================

  // Array que contiene los registros del mes/año actual
  const [characters, setCharacters] = useState<any[]>([]);

  // Array con TODOS los nombres de publicadores existentes (para autocompletado)
  const [allPublisherNames, setAllPublisherNames] = useState<string[]>([]);

  // Estado para mostrar el indicador de carga (spinner)
  const [loading, setLoading] = useState(false);

  // Año actual seleccionado (por defecto el año actual)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Mes actual seleccionado (por defecto el mes actual, del 1 al 12)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Controla si el formulario de agregar/editar está visible
  const [showForm, setShowForm] = useState(false);

  // Modo de vista: 'monthly' (mensual), 'yearly' (anual), 'individual' (individual), 'metrics' (metricas)
  const [viewMode, setViewMode] = useState('monthly');

  // Nombre del publicador seleccionado para la vista individual
  const [selectedCharacter, setSelectedCharacter] = useState('');
  // Si estamos editando un registro existente, guardamos su ID
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado para el modo del formulario: 'nuevo' (nuevo publicador) o 'existente' (actualizar mensual)
  const [formMode, setFormMode] = useState<'nuevo' | 'existente'>('nuevo');

  // Controla si se muestran sugerencias de autocompletado
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mode for Metrics View: 'monthly' | 'yearly'
  const [metricsMode, setMetricsMode] = useState<'monthly' | 'yearly'>('monthly');

  // Controla si el campo de privilegio es editable en modo existente
  const [isPrivilegeEditable, setIsPrivilegeEditable] = useState(false);

  // Controla si el campo de esperanza es editable
  const [isHopeEditable, setIsHopeEditable] = useState(false);

  // Controla si el campo de bautismo es editable

  // Controla si el campo de bautismo es editable
  const [isBaptismEditable, setIsBaptismEditable] = useState(false);

  // ========================================
  // NUEVO: ESTADOS DE FILTROS
  // ========================================
  const [selectedGroup, setSelectedGroup] = useState('TODOS');
  const [selectedBaptized, setSelectedBaptized] = useState('TODOS');
  const [selectedPrivilege, setSelectedPrivilege] = useState('TODOS');
  const [selectedPioneer, setSelectedPioneer] = useState('TODOS');
  const [selectedMinistry, setSelectedMinistry] = useState('TODOS');
  // Removed showPermanentData state as form is now always expanded

  // ========================================
  // ESTADO DEL FORMULARIO
  // ========================================
  // Contiene todos los campos del formulario con sus valores por defecto
  const [formData, setFormData] = useState({
    nombre: '',                           // 1. Nombre del publicador
    categoria2: 'NO',                    // 2. Bautizado (SI/NO)
    categoria3: '',                       // 3. Fecha de bautismo (depende de categoría 2)
    fechaNacimiento: '',                  // 4. Fecha de nacimiento
    genero: 'MASCULINO',                  // 6. Género
    categoria7: 'NO APLICA',              // 7. Esperanza (depende de categoría 2)
    categoria8: 'OPCION8.1',              // 8. Privilegio (depende de categoría 2 y género)
    categoria13: 'LAS CASCADAS',          // 13. Grupo (depende de categoría 2)
    categoria9: 'NO',                     // 9. ¿Participo en el Ministerio? (SI/NO)
    categoria10: '',                       // 10. Estudios bíblicos (depende de categoría 9)
    categoria11: 'NO APLICA',             // 11. ¿Precursor? (depende de categoría 9 y 2)
    categoria12: '0'                      // 12. Horas de servicio (depende de categoría 11)
  });

  // ========================================
  // CONSTANTES Y CONFIGURACIONES
  // ========================================

  // Nombres de los meses en español para mostrar en la interfaz
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ========================================
  // FUNCIONES DE UTILIDAD
  // ========================================

  /**
   * Calcula la edad actual basándose en la fecha de nacimiento
   * @param fechaNacimiento - Fecha de nacimiento en formato string (YYYY-MM-DD)
   * @returns Edad calculada como número entero
   */
  const calcularEdad = (fechaNacimiento: string) => {
    // Si no hay fecha de nacimiento, retornamos 0
    if (!fechaNacimiento) return 0;

    // Obtenemos la fecha actual y la fecha de nacimiento
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);

    // Calculamos la diferencia de años
    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    // Ajustamos la edad si todavía no cumplió años este año
    // Restamos 1 si el mes actual es menor al mes de nacimiento,
    // o si es el mismo mes pero el día es menor
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  };

  /**
   * Valida que una fecha no sea mayor al año de registro
   */
  const validarFechaContraRegistro = (fecha: string, anioRegistro: number) => {
    if (!fecha) return true;
    const date = new Date(fecha);
    return date.getFullYear() <= anioRegistro;
  };

  /**
   * Busca si un publicador ya tiene registros en el sistema
   * Esto nos permite saber si es un publicador nuevo o existente
   * @param nombre - Nombre del publicador a buscar
   * @returns El registro más reciente del publicador o null si no existe
   */
  const findExistingPublisher = async (nombre: string) => {
    try {
      // Buscamos todos los registros del publicador (no filtramos por año/mes)
      const response = await fetch(`/api/characters?nombre=${encodeURIComponent(nombre)}`);
      if (response.ok) {
        const data = await response.json();
        // Si hay registros, retornamos el último (más reciente)
        if (data && data.length > 0) {
          return data[data.length - 1];
        }
      }
    } catch (error) {
      console.error('Error buscando publicador existente:', error);
    }
    return null;
  };

  /**
   * Filtra la lista de nombres de publicadores según el input
   * @param input - Texto del input del nombre
   * @returns Array de nombres filtrados
   */
  const getFilteredSuggestions = (input: string) => {
    if (!input || input.trim() === '') {
      return allPublisherNames;
    }
    const lowerInput = input.toLowerCase();
    return allPublisherNames.filter((name: string) =>
      name.toLowerCase().includes(lowerInput)
    );
  };

  // ========================================
  // FUNCIONES DE FETCH DE DATOS
  // ========================================

  /**
   * Obtiene los registros de publicadores del año y mes actual
   * Se ejecuta automáticamente cuando cambia el año o el mes
   */
  const fetchCharacters = async () => {
    setLoading(true);
    try {
      // Creamos los parámetros de consulta para la API
      const params = new URLSearchParams({
        year: currentYear.toString(),
        month: currentMonth.toString()
      });

      // Hacemos la petición GET a la API
      const response = await fetch(`/api/characters?${params.toString()}`);

      // Si la respuesta es exitosa, actualizamos el estado
      if (response.ok) {
        const data = await response.json();
        setCharacters(data);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      // Siempre ocultamos el indicador de carga, haya error o no
      setLoading(false);
    }
  };





  // ========================================
  // EFFECT HOOKS
  // ========================================

  // Este effect se ejecuta cuando el componente se monta
  // Carga todos los nombres de publicadores para el autocompletado
  useEffect(() => {
    const fetchAllPublisherNames = async () => {
      try {
        // Obtenemos todos los registros sin filtrar por año/mes
        const response = await fetch('/api/characters');
        if (response.ok) {
          const data = await response.json();
          // Extraemos nombres únicos y los ordenamos alfabéticamente
          const uniqueNames = [...new Set(data.map((c: any) => c.nombre))] as string[];
          setAllPublisherNames(uniqueNames);
        }
      } catch (error) {
        console.error('Error fetching publisher names:', error);
      }
    };

    fetchAllPublisherNames();
  }, []);

  // Este effect se ejecuta cada vez que cambian currentYear o currentMonth
  // Lo que hace es recargar los datos automáticamente cuando el usuario cambia de año o mes
  useEffect(() => {
    fetchCharacters();
  }, [currentYear, currentMonth]);

  // ========================================
  // MANEJO DE CAMBIOS EN EL FORMULARIO
  // ========================================

  /**
   * Maneja los cambios en los campos del formulario
   * Implementa la lógica de dependencias entre campos
   * @param field - Nombre del campo que cambió
   * @param value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: any) => {
    setFormData((prevFormData) => {
      // Creamos una copia del estado actual con el valor actualizado
      const newFormData = { ...prevFormData, [field]: value };

      // --- CATEGORÍA 2: BAUTIZADO ---
      // Si cambia el estado de bautismo, afecta a: Categoría 3, 7, 8, 11
      if (field === 'categoria2') {
        if (value === 'NO') {
          newFormData.categoria3 = '';
          newFormData.categoria7 = 'NO APLICA';
          newFormData.categoria8 = 'OPCION8.1';
          newFormData.categoria11 = 'NO APLICA';
        } else {
          newFormData.categoria3 = '';
          newFormData.categoria7 = 'OPCION7.1';
          newFormData.categoria13 = 'LAS CASCADAS';
          if (newFormData.genero === 'MASCULINO') {
            newFormData.categoria8 = 'OPCION8.1';
          }
        }
      }

      // --- CATEGORÍA 6: GÉNERO ---
      // Si cambia el género, afecta a: Categoría 8 (Privilegio)
      if (field === 'genero') {
        if (prevFormData.categoria2 === 'SI' && value === 'MASCULINO') {
          newFormData.categoria8 = 'OPCION8.1';
        } else {
          newFormData.categoria8 = 'OPCION8.1';
        }
      }

      // --- CATEGORÍA 9: ¿PARTICIPO EN EL MINISTERIO? ---
      // Si cambia esta respuesta, afecta a: Categoría 10, 11, 12
      if (field === 'categoria9') {
        if (value === 'NO') {
          newFormData.categoria10 = '';
          newFormData.categoria11 = 'NO APLICA';
          newFormData.categoria12 = '0';
        } else {
          newFormData.categoria10 = '0';
          if (prevFormData.categoria2 === 'SI') {
            newFormData.categoria11 = 'NO';
          }
        }
      }

      // --- CATEGORÍA 11: ¿PRECURSOR? ---
      // Si cambia, afecta a: Categoría 12 (Horas de servicio)
      if (field === 'categoria11') {
        if (value === 'NO' || value === 'NO APLICA') {
          newFormData.categoria12 = '0';
        }
      }

      // --- VALIDACIONES DE TOPES ---
      // Categoría 10: Estudios Bíblicos (Max 50)
      if (field === 'categoria10' && value !== '') {
        const numVal = parseInt(value);
        if (numVal > 50) newFormData.categoria10 = '50';
      }

      // Categoría 12: Horas (Max 999)
      if (field === 'categoria12' && value !== '') {
        const numVal = parseFloat(value);
        if (numVal > 999) newFormData.categoria12 = '999';
      }

      return newFormData;
    });
  };

  // ========================================
  // ABRIR FORMULARIO PARA AGREGAR/EDITAR
  // ========================================

  /**
   * Abre el formulario en modo "nuevo publicador"
   * Se usa cuando el publicador no existe en la base de datos
   */
  const openNewPublisherForm = () => {
    setFormMode('nuevo');
    setEditingId(null);
    setShowSuggestions(false);
    setEditingId(null);
    setShowSuggestions(false);
    setIsPrivilegeEditable(false);
    setIsBaptismEditable(false);
    setIsHopeEditable(false);
    // Resetear el formulario a sus valores iniciales
    setFormData({
      nombre: '',
      categoria2: 'NO',
      categoria3: '',
      fechaNacimiento: '',
      genero: 'MASCULINO',
      categoria7: 'NO APLICA',
      categoria8: 'OPCION8.1',
      categoria13: 'LAS CASCADAS',
      categoria9: 'NO',
      categoria10: '',
      categoria11: 'NO APLICA',
      categoria12: '0'
    });
    setShowForm(true);
  };

  /**
   * Carga los datos del último registro de un publicador existente
   * Prellena las categorías 1-8 y 13 con datos del último registro
   * Solo deja editables las categorías 9-12 (datos mensuales)
   * @param nombre - Nombre del publicador
   */
  const loadPublisherLastRecord = async (nombre: string) => {
    const latestRecord = await findExistingPublisher(nombre);

    if (latestRecord) {
      // El publicador existe, cambiamos a modo actualizar
      setFormMode('existente');
      setEditingId(null);
      setShowSuggestions(false);
      setShowSuggestions(false);
      setShowSuggestions(false);
      setIsPrivilegeEditable(false);
      setIsBaptismEditable(false);
      setIsHopeEditable(false);

      // Cargamos los datos del último registro
      setFormData({
        nombre: latestRecord.nombre,
        categoria2: latestRecord.categoria2,
        categoria3: latestRecord.categoria3 || '',
        fechaNacimiento: latestRecord.fechaNacimiento,
        genero: latestRecord.genero,
        categoria7: latestRecord.categoria7 || 'NO APLICA',
        categoria8: latestRecord.categoria8 || 'OPCION8.1',
        categoria13: latestRecord.categoria13 || 'LAS CASCADAS',
        categoria9: 'NO',
        categoria10: '',
        categoria11: latestRecord.categoria2 === 'SI' ? 'NO' : 'NO APLICA',
        categoria12: '0'
      });
    } else {
      // No existe, cambiamos a modo nuevo
      setFormMode('nuevo');
      setIsPrivilegeEditable(false);
      setFormMode('nuevo');
      setIsPrivilegeEditable(false);
      setIsBaptismEditable(false);
      setIsHopeEditable(false);
    }
  };

  /**
   * Maneja la selección de un publicador de la lista de sugerencias
   * @param nombre - Nombre seleccionado
   */
  const selectPublisherFromSuggestion = (nombre: string) => {
    setFormData({ ...formData, nombre });
    setShowSuggestions(false);
    loadPublisherLastRecord(nombre);
  };

  /**
   * Maneja el cambio en el campo de nombre
   * Muestra sugerencias si escribe algo
   * @param value - Nuevo valor del nombre
   */
  const handleNameInputChange = (value: string) => {
    setFormData({ ...formData, nombre: value });

    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Alterna el estado de edición del campo de privilegio
   * Permite al usuario cambiar el privilegio fácilmente en modo existente
   */
  const togglePrivilegeEditable = () => {
    setIsPrivilegeEditable(!isPrivilegeEditable);
  };

  // ========================================
  // FUNCIÓN PARA AGREGAR/ACTUALIZAR REGISTRO
  // ========================================

  /**
   * Guarda el registro del publicador (nuevo o actualización mensual)
   */
  const addCharacter = async () => {
    // Validación: Nombre y fecha de nacimiento son obligatorios
    if (!formData.nombre || !formData.fechaNacimiento) {
      alert('Por favor completa el nombre y fecha de nacimiento');
      return;
    }

    // Validación: Fechas congruentes con el año de registro
    if (!validarFechaContraRegistro(formData.fechaNacimiento, currentYear)) {
      alert(`La fecha de nacimiento no puede ser posterior al año de registro (${currentYear})`);
      return;
    }

    if (formData.categoria3) {
      const baptismDate = new Date(formData.categoria3);
      // Create a date object for the END of the current selected month
      // month is 1-indexed in our state, so we use it directly for next month 0-day
      const maxDate = new Date(currentYear, currentMonth, 0);

      if (baptismDate > maxDate) {
        alert(`La fecha de bautismo no puede ser posterior al mes de registro (${months[currentMonth - 1]} ${currentYear})`);
        return;
      }
    }

    // Validación: Bautismo posterior a nacimiento
    if (formData.categoria3 && formData.fechaNacimiento) {
      const nac = new Date(formData.fechaNacimiento);
      const bau = new Date(formData.categoria3);
      if (bau <= nac) {
        alert('La fecha de bautismo debe ser posterior a la fecha de nacimiento');
        return;
      }
    }

    setLoading(true);
    try {
      // Calculamos la edad automáticamente
      const fechaNacimiento = new Date(formData.fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      // Preparamos los datos a enviar
      const dataToSend: any = {
        nombre: formData.nombre,
        categoria2: formData.categoria2,
        categoria3: formData.categoria3 || null,
        fechaNacimiento: formData.fechaNacimiento,
        edad: edad,
        genero: formData.genero,
        categoria7: formData.categoria7,
        categoria8: formData.categoria8,
        categoria13: formData.categoria13 || null,
        categoria9: formData.categoria9,
        categoria10: formData.categoria10 ? parseInt(formData.categoria10) : null,
        categoria11: formData.categoria11,
        categoria12: parseFloat(formData.categoria12),
        year: currentYear,
        month: currentMonth
      };

      // Hacemos la petición POST a la API para crear el registro
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      // Si la respuesta es exitosa:
      if (response.ok) {
        // Si guardamos un registro de un publicador existente,
        // actualizamos la lista de nombres para mantenerla actualizada
        if (!allPublisherNames.includes(formData.nombre)) {
          const newNames = [...allPublisherNames, formData.nombre].sort();
          setAllPublisherNames(newNames);
        }

        // Cerramos el formulario
        setShowForm(false);
        setShowSuggestions(false);
        setFormMode('nuevo');
        setEditingId(null);
        setIsPrivilegeEditable(false);

        // Recargamos los datos
        fetchCharacters();
        alert('✅ Registro guardado exitosamente');
      } else {
        alert('❌ Error al guardar el registro');
      }
    } catch (error) {
      console.error('Error adding character:', error);
      alert('❌ Error de conexión al guardar');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FUNCIÓN PARA EDITAR REGISTRO
  // ========================================

  /**
   * Abre el formulario para editar un registro existente
   * @param character - Datos del registro a editar
   */
  const editCharacter = (character: any) => {
    setEditingId(character.id);
    setFormMode('existente');
    setShowSuggestions(false);
    setFormMode('existente');
    setShowSuggestions(false);
    setIsPrivilegeEditable(false);
    setIsBaptismEditable(false);
    setIsHopeEditable(false);

    setFormData({
      nombre: character.nombre,
      categoria2: character.categoria2,
      categoria3: character.categoria3 || '',
      fechaNacimiento: character.fechaNacimiento,
      genero: character.genero,
      categoria7: character.categoria7 || 'NO APLICA',
      categoria8: character.categoria8 || 'OPCION8.1',
      categoria13: character.categoria13 || 'LAS CASCADAS',
      categoria9: character.categoria9,
      categoria10: character.categoria10?.toString() || '',
      categoria11: character.categoria11 || 'NO APLICA',
      categoria12: character.categoria12?.toString() || '0'
    });
    setShowForm(true);
  };

  // ========================================
  // FUNCIONES PARA ELIMINAR REGISTROS
  // ========================================

  /**
   * Elimina un registro solo del mes actual
   * @param id - ID del registro a eliminar
   */
  const deleteCharacterFromMonth = async (id: string) => {
    if (!confirm('¿Eliminar este registro solo de este mes?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCharacters();
        alert('✅ Registro eliminado del mes');
      }
    } catch (error) {
      console.error('Error deleting character:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Elimina todos los registros de un publicador en todo el año
   * @param nombre - Nombre del publicador a eliminar del año
   */
  const deleteCharacterFromYear = async (nombre: string) => {
    if (!confirm(`¿Eliminar a "${nombre}" de TODO el año ${currentYear}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/characters/year/${encodeURIComponent(nombre)}?year=${currentYear}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCharacters();
        alert(`✅ ${nombre} eliminado del año ${currentYear}`);
      }
    } catch (error) {
      console.error('Error deleting character from year:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FUNCIONES DE FILTRADO
  // ========================================

  /**
   * Filtra y retorna los registros del año y mes actual
   */
  /**
   * Filtra y retorna los registros del año y mes actual
   */
  const getMonthlyCharacters = () => {
    return characters.filter((c: any) => {
      // 1. Filtro básico de Fecha
      if (c.year !== currentYear || c.month !== currentMonth) return false;

      // 2. Filtro de Grupo
      if (selectedGroup !== 'TODOS' && c.categoria13 !== selectedGroup) return false;

      // 3. Filtro de Bautizado
      if (selectedBaptized !== 'TODOS') {
        if (selectedBaptized === 'SI' && c.categoria2 !== 'SI') return false;
        if (selectedBaptized === 'NO' && c.categoria2 !== 'NO') return false;
      }

      // 4. Filtro de Privilegio
      if (selectedPrivilege !== 'TODOS') {
        const privMap: any = {
          'PUBLICADOR': 'OPCION8.1',
          'SIERVO MINISTERIAL': 'OPCION8.2',
          'ANCIANO': 'OPCION8.3',
          'MISIONERO': 'OPCION8.4'
        };
        // Si el privilegio es texto plano en la BD, ajusta esto. Asumo que usa los códigos 'OPCION8.x'
        // Si el usuario selecciona "ANCIANO", buscamos "OPCION8.3"
        if (c.categoria8 !== privMap[selectedPrivilege]) return false;
      }

      // 5. Filtro de Precursor
      // Si el filtro "No Bautizados" está activo, ignoramos este filtro (porque un no bautizado no puede ser precursor)
      if (selectedBaptized !== 'NO' && selectedPioneer !== 'TODOS') {
        if (selectedPioneer === 'SI' && c.categoria11 !== 'SI') return false;
        if (selectedPioneer === 'NO' && c.categoria11 === 'SI') return false;
      }

      // 6. Nuevo Filtro: Participo en Ministerio
      if (selectedMinistry !== 'TODOS') {
        if (selectedMinistry === 'SI' && c.categoria9 !== 'SI') return false;
        if (selectedMinistry === 'NO' && c.categoria9 !== 'NO') return false;
      }

      return true;
    });
  };

  /**
   * Obtiene todos los registros del año actual desde la API
   */
  const getYearlyCharacters = async () => {
    try {
      const response = await fetch(`/api/characters?year=${currentYear}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching yearly characters:', error);
    }
    return [];
  };

  /**
   * Obtiene el resumen anual de un publicador específico
   * @param nombre - Nombre del publicador
   */
  /**
   * Obtiene el resumen anual de un publicador específico
   * @param nombre - Nombre del publicador
   * @param year - Año a consultar (opcional, por defecto usa currentYear)
   */
  const getCharacterYearlySummary = async (nombre: string, year: number = currentYear) => {
    try {
      const response = await fetch(`/api/characters/summary/${encodeURIComponent(nombre)}?year=${year}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching character summary:', error);
    }
    return { data: [], total: 0 };
  };

  // ========================================
  // FUNCIÓN PARA EXPORTAR A CSV
  // ========================================

  /**
   * Exporta todos los registros del año actual a formato CSV
   * Puede abrirse en Excel para análisis externo
   */
  const exportToCSV = async () => {
    try {
      const response = await fetch(`/api/characters?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();

        // Creamos el encabezado del CSV con los nombres actualizados de las categorías
        let csv = 'Nombre,Bautizado,Fecha Bautismo,Fecha Nacimiento,Edad,Genero,Esperanza,Privilegio,Grupo,Participa Ministerio,Estudios Biblicos,Precursor,Horas Servicio,Mes,Año\n';

        // Agregamos cada registro al CSV
        data.forEach((c: any) => {
          csv += `${c.nombre},${c.categoria2},${c.categoria3 || ''},${c.fechaNacimiento},${c.edad},${c.genero},${c.categoria7 || ''},${c.categoria8 || ''},${c.categoria13 || ''},${c.categoria9},${c.categoria10 || ''},${c.categoria11 || ''},${c.categoria12},${c.month},${c.year}\n`;
        });

        // Creamos un Blob y forzamos la descarga
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `publicadores_${currentYear}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  };

  // ========================================
  // OBTENER LISTA ÚNICA DE PUBLICADORES
  // ========================================

  // Crea una lista de nombres únicos para los selectores
  const uniqueCharacters = [...new Set(characters.map((c: any) => c.nombre))];

  // ========================================
  // RENDERIZADO DEL COMPONENTE
  // ========================================  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">

        {/* ========================================
            SECCIÓN: HEADER Y CONTROLES
            ======================================== */}
        <div className="bg-blue-900 text-white rounded-xl p-6 mb-6">
          {/* Título principal */}
          <h1 className="text-3xl font-bold mb-4">📊 Base de Datos de Publicadores Congregación Modelo</h1>

          {/* Caja blanca con selectores de año y mes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selector de Año */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Año</label>
                <input
                  type="number"
                  min={new Date().getFullYear() - 15}
                  max={new Date().getFullYear()}
                  value={currentYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const maxYear = new Date().getFullYear();
                    const minYear = maxYear - 15;
                    if (val > maxYear) setCurrentYear(maxYear);
                    else if (val < minYear) setCurrentYear(minYear);
                    else setCurrentYear(val);
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Selector de Mes */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Mes</label>
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selectores de Filtros (Nueva Fila) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4 pt-4 border-t border-gray-100">
              {/* Filtro Grupo */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Filtrar por Grupo</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos los Grupos</option>
                  <option value="LAS CASCADAS">Las Cascadas</option>
                  <option value="LAS HADAS">Las Hadas</option>
                  <option value="LAS UVAS">Las Uvas</option>
                  <option value="SALON DEL REINO">Salón del Reino</option>
                  <option value="MISIONERO">Misionero</option>
                </select>
              </div>

              {/* Filtro Bautizado */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Filtrar por Estado</label>
                <select
                  value={selectedBaptized}
                  onChange={(e) => setSelectedBaptized(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos</option>
                  <option value="SI">Bautizados</option>
                  <option value="NO">No Bautizados</option>
                </select>
              </div>

              {/* Filtro Privilegio */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Filtrar por Privilegio</label>
                <select
                  value={selectedPrivilege}
                  onChange={(e) => setSelectedPrivilege(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PUBLICADOR">Publicador</option>
                  <option value="SIERVO MINISTERIAL">Siervo Ministerial</option>
                  <option value="ANCIANO">Anciano</option>
                  <option value="MISIONERO">Misionero</option>
                </select>
              </div>

              {/* Filtro Precursor */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Participación Precursorado</label>
                <select
                  value={selectedPioneer}
                  onChange={(e) => setSelectedPioneer(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={selectedBaptized === 'NO'} // Deshabilitado si es No Bautizado
                >
                  <option value="TODOS">Todos</option>
                  <option value="SI">Participaron (SI)</option>
                  <option value="NO">No Participaron</option>
                </select>
              </div>

              {/* Nuevo Filtro: Participo en Ministerio */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Participación Ministerio</label>
                <select
                  value={selectedMinistry}
                  onChange={(e) => setSelectedMinistry(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos</option>
                  <option value="SI">Participaron (SI)</option>
                  <option value="NO">No Participaron</option>
                </select>
              </div>
            </div>

            {/* Botones de acción principales */}
            <div className="flex flex-wrap gap-4 mt-4">
              <button
                onClick={openNewPublisherForm}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> Agregar Registro</>}
              </button>

              <button
                onClick={exportToCSV}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Exportar Año</>}
              </button>
            </div>
          </div>

          {/* Botones para cambiar entre modos de vista */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              <Calendar size={16} /> Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode === 'yearly' ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              <BarChart3 size={16} /> Resumen Anual
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode === 'individual' ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              <User size={16} /> Vista Individual
            </button>
            <button
              onClick={() => setViewMode('metrics')}
              className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode === 'metrics' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              <PieChart size={16} /> Metricas
            </button>
          </div>

          {/* Sub-selector para Métricas (Solo visible en modo metrics) */}
          {viewMode === 'metrics' && (
            <div className="mt-4 bg-white/10 p-1 rounded-lg inline-flex">
              <button
                onClick={() => setMetricsMode('monthly')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${metricsMode === 'monthly' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:bg-white/5'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setMetricsMode('yearly')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${metricsMode === 'yearly' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:bg-white/5'}`}
              >
                Anual
              </button>
            </div>
          )}
        </div>
      </div >

      {/* ========================================
            SECCIÓN: FORMULARIO DE AGREGAR/EDITAR
            ======================================== */}
      {
        showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {editingId ? 'Editar Registro' : formMode === 'nuevo' ? 'Nuevo Publicador' : `Actualizar Registro - ${months[currentMonth - 1]} ${currentYear}`}
            </h2>

            {/* Indicador del modo actual */}
            {formMode === 'existente' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-blue-800 flex justify-between items-center">
                <p className="text-sm">
                  <strong>📋 Modo Actualización Mensual:</strong>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ========================================
                    CAMPOS UNIFICADOS (MODO NUEVO Y EXISTENTE)
                    ======================================== */}

              {/* 1. NOMBRE COMPLETO */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-gray-900">1. Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  onFocus={() => {
                    if (formData.nombre.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  disabled={formMode === 'existente'} // Nombre no editable en modo existente
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder={formMode === 'nuevo' ? 'Escribe el nombre o selecciona de la lista' : formData.nombre}
                  autoComplete="off"
                />

                {/* Lista de sugerencias de autocompletado */}
                {showSuggestions && getFilteredSuggestions(formData.nombre).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredSuggestions(formData.nombre).map((name, index) => (
                      <div
                        key={index}
                        onClick={() => selectPublisherFromSuggestion(name)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                      >
                        <span>{name}</span>
                        <span className="text-xs text-gray-500">
                          {months[currentMonth - 1]} {currentYear}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. BAUTIZADO (Protegido) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium mb-1 text-gray-900">2. Bautizado *</label>
                  {!isBaptismEditable && (
                    <AuthGuard actionName="Cambiar Bautismo" onVerified={() => setIsBaptismEditable(true)}>
                      <button className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1 text-gray-600 transition-colors">
                        <Lock size={10} /> Desbloquear
                      </button>
                    </AuthGuard>
                  )}
                </div>
                {isBaptismEditable ? (
                  <select
                    value={formData.categoria2}
                    onChange={(e) => handleInputChange('categoria2', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.categoria2}
                      disabled
                      className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Lock size={14} className="text-gray-400" />
                    </div>
                  </div>
                )}
                <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <Lock size={10} />
                  Este campo esta protegido por contraseña
                </p>
              </div>

              {/* 3. FECHA DE BAUTISMO (Depende de Bautizado Editable) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">3. Fecha de Bautismo</label>
                <input
                  type="date"
                  max={`${currentYear}-12-31`}
                  value={formData.categoria3}
                  onChange={(e) => handleInputChange('categoria3', e.target.value)}
                  disabled={formData.categoria2 === 'NO' || !isBaptismEditable} // Se habilita solo si Bautizado es editable y es SI
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 placeholder-gray-400"
                />
                {formData.categoria2 === 'NO' && <span className="text-sm text-gray-500">NO APLICA</span>}
              </div>

              {/* 4. FECHA DE NACIMIENTO */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">4. Fecha de Nacimiento *</label>
                <input
                  type="date"
                  max={`${currentYear}-12-31`}
                  value={formData.fechaNacimiento}
                  onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                  disabled={formMode === 'existente'} // Solo lectura en modo existente
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* 5. EDAD (Calculado) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">5. Edad</label>
                <input
                  type="text"
                  value={calcularEdad(formData.fechaNacimiento)}
                  disabled
                  className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* 6. GÉNERO */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">6. Género *</label>
                <select
                  value={formData.genero}
                  onChange={(e) => handleInputChange('genero', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                // Género podría ser editable, si no se especifica lo contrario. Asumimos editable.
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMENINO">FEMENINO</option>
                </select>
              </div>

              {/* 7. ESPERANZA (Protegido) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium mb-1 text-gray-900">7. Esperanza</label>
                  {formData.categoria2 !== 'NO' && !isHopeEditable && (
                    <AuthGuard actionName="Cambiar Esperanza" onVerified={() => setIsHopeEditable(true)}>
                      <button className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1 text-gray-600 transition-colors">
                        <Lock size={10} /> Desbloquear
                      </button>
                    </AuthGuard>
                  )}
                </div>
                {isHopeEditable && formData.categoria2 !== 'NO' ? (
                  <select
                    value={formData.categoria7}
                    onChange={(e) => handleInputChange('categoria7', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  >
                    <option value="OPCION7.1">Otras Ovejas</option>
                    <option value="OPCION7.2">Ungido</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.categoria7 === 'OPCION7.1' ? 'Otras Ovejas' : formData.categoria7 === 'OPCION7.2' ? 'Ungido' : 'NO APLICA'}
                      disabled
                      className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    {formData.categoria2 !== 'NO' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Lock size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                )}
                {formData.categoria2 !== 'NO' && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <Lock size={10} />
                    Este campo esta protegido por contraseña
                  </p>
                )}
              </div>

              {/* 8. PRIVILEGIO (Protegido) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium mb-1 text-gray-900">8. Privilegio</label>
                  {formData.categoria2 !== 'NO' && formData.genero === 'MASCULINO' && !isPrivilegeEditable && (
                    <AuthGuard actionName="Cambiar Privilegio" onVerified={() => setIsPrivilegeEditable(true)}>
                      <button className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1 text-gray-600 transition-colors">
                        <Lock size={10} /> Desbloquear
                      </button>
                    </AuthGuard>
                  )}
                </div>
                {isPrivilegeEditable && formData.categoria2 !== 'NO' && formData.genero === 'MASCULINO' ? (
                  <select
                    value={formData.categoria8}
                    onChange={(e) => handleInputChange('categoria8', e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  >
                    <option value="OPCION8.1">Publicador</option>
                    <option value="OPCION8.2">Siervo Ministerial</option>
                    <option value="OPCION8.3">Anciano</option>
                    <option value="OPCION8.4">Misionero en Campo</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.categoria8 === 'OPCION8.1' ? 'Publicador' :
                        formData.categoria8 === 'OPCION8.2' ? 'Siervo Ministerial' :
                          formData.categoria8 === 'OPCION8.3' ? 'Anciano' :
                            formData.categoria8 === 'OPCION8.4' ? 'Misionero en Campo' : ''}
                      disabled
                      className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    {formData.categoria2 !== 'NO' && formData.genero === 'MASCULINO' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Lock size={14} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                )}
                {formData.categoria2 !== 'NO' && formData.genero === 'MASCULINO' && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <Lock size={10} />
                    Este campo esta protegido por contraseña
                  </p>
                )}
              </div>

              {/* 13. GRUPO */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">13. Grupo</label>
                <select
                  value={formData.categoria13}
                  onChange={(e) => handleInputChange('categoria13', e.target.value)}
                  disabled={formData.categoria2 === 'NO'}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="LAS CASCADAS">Las Cascadas</option>
                  <option value="LAS HADAS">Las Hadas</option>
                  <option value="LAS UVAS">Las Uvas</option>
                  <option value="SALON DEL REINO">Salón del Reino</option>
                </select>
              </div>
              {/* ========================================
                  CAMPOS MENSUALES (9-12)
                  SIEMPRE VISIBLES
                  ======================================== */}

              {/* 9. ¿PARTICIPO EN EL MINISTERIO? */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">9. ¿Participo en el Ministerio? *</label>
                <select
                  value={formData.categoria9}
                  onChange={(e) => handleInputChange('categoria9', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              {/* 10. ESTUDIOS BÍBLICOS (Depende de Categoría 9) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">10. Estudios Biblicos conducidos en el mes</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.categoria10}
                  onChange={(e) => handleInputChange('categoria10', e.target.value)}
                  disabled={formData.categoria9 === 'NO'}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {formData.categoria9 === 'NO' && <span className="text-sm text-gray-500">NO APLICA</span>}
              </div>

              {/* 11. ¿PRECURSOR? (Depende de Categoría 9 y 2) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">11. ¿Si participo como precursor este mes?</label>
                <select
                  value={formData.categoria11}
                  onChange={(e) => handleInputChange('categoria11', e.target.value)}
                  disabled={formData.categoria2 === 'NO' || formData.categoria9 === 'NO'}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                  {(formData.categoria2 === 'NO' || formData.categoria9 === 'NO') && (
                    <option value="NO APLICA">NO APLICA</option>
                  )}
                </select>
              </div>

              {/* 12. HORAS DE SERVICIO (Depende de Categoría 11) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">12. Cantidad de horas en servicio</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="999"
                  value={formData.categoria12}
                  onChange={(e) => handleInputChange('categoria12', e.target.value)}
                  disabled={formData.categoria11 !== 'SI'}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {(formData.categoria11 !== 'SI') && (
                  <span className="text-sm text-gray-500">Solo disponible para preculsore</span>
                )}
              </div>

            </div>

            {/* Botones de acción del formulario */}
            <div className="flex gap-2">
              <button
                onClick={addCharacter}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : '✅ Guardar Registro'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setShowSuggestions(false);
                  setFormMode('nuevo');
                  setEditingId(null);
                  setFormMode('nuevo');
                  setEditingId(null);
                  setEditingId(null);
                  setIsPrivilegeEditable(false);
                  setIsBaptismEditable(false);
                  setIsHopeEditable(false);
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        )
      }

      {/* Indicador de carga global */}
      {
        loading && !showForm && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        )
      }

      {/* ========================================
            SECCIÓN: VISTA MENSUAL
            ======================================== */}
      {
        viewMode === 'monthly' && !loading && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              📅 {months[currentMonth - 1]} {currentYear} - {getMonthlyCharacters().length} registros
            </h2>

            {/* Tabla de registros mensuales con scroll */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-amber-600 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Bautizado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Fecha Bautismo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Nacimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Edad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Género</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Esperanza</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Privilegio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Grupo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Participa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Estudios</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Precursor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Horas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getMonthlyCharacters().map((char: any) => (
                    <tr key={char.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{char.nombre}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.categoria2}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {char.categoria3 ? new Date(char.categoria3).toISOString().split('T')[0] : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(char.fechaNacimiento).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.edad}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.genero}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {char.categoria7 === 'OPCION7.1' ? 'Otras Ovejas' :
                          char.categoria7 === 'OPCION7.2' ? 'Ungido' : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {char.categoria8 === 'OPCION8.1' ? 'Publicador' :
                          char.categoria8 === 'OPCION8.2' ? 'Siervo Ministerial' :
                            char.categoria8 === 'OPCION8.3' ? 'Anciano' :
                              char.categoria8 === 'OPCION8.4' ? 'Misionero en Campo' : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {char.categoria13 || ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.categoria9}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.categoria10 || ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{char.categoria11 || ''}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold">{char.categoria12}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => editCharacter(char)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Editar registro"
                          >
                            <Edit size={16} />
                          </button>
                          <AuthGuard actionName="Borrar" onVerified={() => deleteCharacterFromMonth(char.id)}>
                            <button
                              className="text-red-600 hover:text-red-800"
                              title="Eliminar de este mes"
                            >
                              <Trash2 size={16} />
                            </button>
                          </AuthGuard>
                          <button
                            onClick={() => deleteCharacterFromYear(char.nombre)}
                            className="text-gray-600 hover:text-gray-800 text-xs"
                            title="Eliminar del año completo"
                          >
                            🗑️ Año
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* ========================================
            SECCIÓN: VISTA MÉTRICAS
            ======================================== */}
      {
        viewMode === 'metrics' && !loading && (
          metricsMode === 'monthly' ? (
            <MetricsView
              characters={getMonthlyCharacters()}
              title={`Métricas del Mes: ${months[currentMonth - 1]} ${currentYear}`}
              isYearly={false}
            />
          ) : (
            <YearlyMetricsLoader
              year={currentYear}
              onGetYearlyData={getYearlyCharacters}
            />
          )
        )
      }

      {/* ========================================
            SECCIÓN: VISTA ANUAL
            ======================================== */}
      {
        viewMode === 'yearly' && !loading && (
          <YearlyView
            year={currentYear}
            months={months}
            uniqueCharacters={uniqueCharacters}
            onGetCharacterYearlySummary={getCharacterYearlySummary}
            onGoToIndividual={(nombre: string) => {
              setSelectedCharacter(nombre);
              setViewMode('individual');
            }}
            // Pasar filtros
            selectedGroup={selectedGroup}
            selectedBaptized={selectedBaptized}
            selectedPrivilege={selectedPrivilege}
            selectedPioneer={selectedPioneer}
          />
        )
      }

      {/* ========================================
            SECCIÓN: VISTA INDIVIDUAL
            ======================================== */}
      {
        viewMode === 'individual' && !loading && (
          <IndividualView
            year={currentYear}
            months={months}
            uniqueCharacters={uniqueCharacters}
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
            onGetCharacterYearlySummary={getCharacterYearlySummary}
          />
        )
      }


      {/* ========================================
          FOOTER
          ======================================== */}
      <footer className="mt-auto bg-white shadow-lg p-4 text-center text-gray-600">
        <p>Base de Datos de Publicadores Congregación Modelo</p>
      </footer>
    </div >
  );
};

// ========================================
// COMPONENTE: VISTA ANUAL (Resumen)
// ========================================
/**
 * Componente que muestra el resumen anual de todos los publicadores
 * Muestra los datos de cada mes en una cuadrícula visual
 * Al hacer clic en un publicador, se va a la vista individual
 */
function YearlyView({ year, months, onGetCharacterYearlySummary, onGoToIndividual, selectedGroup, selectedBaptized, selectedPrivilege, selectedPioneer }: any) {
  const [summaries, setSummaries] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [allYearlyNames, setAllYearlyNames] = useState<string[]>([]);

  // 1. Obtener datos del año (Nombres y Resúmenes unificados)
  useEffect(() => {
    const loadYearlyData = async () => {
      setLoading(true);
      try {
        // A. Obtener nombres
        const response = await fetch(`/api/characters?year=${year}`);
        let names: string[] = [];

        if (response.ok) {
          const data = await response.json();
          names = [...new Set(data.map((c: any) => c.nombre))] as string[];
          setAllYearlyNames(names.sort());
        }

        // B. Si hay nombres, obtener sus resúmenes
        if (names.length > 0) {
          const newSummaries: any = {};
          // Ejecutamos en paralelo para mayor velocidad
          await Promise.all(names.map(async (nombre) => {
            const summary = await onGetCharacterYearlySummary(nombre, year);
            newSummaries[nombre] = summary;
          }));
          setSummaries(newSummaries);
        } else {
          setSummaries({});
        }

      } catch (error) {
        console.error('Error loading yearly data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadYearlyData();
  }, [year, onGetCharacterYearlySummary]);

  // 3. Filtrar la lista a mostrar
  const getFilteredNames = () => {
    return allYearlyNames.filter(nombre => {
      const summary = summaries[nombre];
      if (!summary || !summary.data || summary.data.length === 0) return false;

      // Usamos el último registro disponible del año para verificar sus "datos estáticos"
      // (Grupo, Bautizado, Privilegio). 
      // NOTA: Esto asume que si cambió de grupo en Diciembre, aparece como ese grupo.
      // Es lo esperado generalmente.
      const lastRecord = summary.data[summary.data.length - 1];

      // Filtro Grupo
      if (selectedGroup !== 'TODOS' && lastRecord.categoria13 !== selectedGroup) return false;

      // Filtro Bautizado
      if (selectedBaptized !== 'TODOS') {
        if (selectedBaptized === 'SI' && lastRecord.categoria2 !== 'SI') return false;
        if (selectedBaptized === 'NO' && lastRecord.categoria2 !== 'NO') return false;
      }

      // Filtro Privilegio
      if (selectedPrivilege !== 'TODOS') {
        const privMap: any = {
          'PUBLICADOR': 'OPCION8.1',
          'SIERVO MINISTERIAL': 'OPCION8.2',
          'ANCIANO': 'OPCION8.3',
          'MISIONERO': 'OPCION8.4'
        };
        if (lastRecord.categoria8 !== privMap[selectedPrivilege]) return false;
      }

      // Filtro Precursor (Participación en el año)
      if (selectedPioneer !== 'TODOS') {
        // En anual, verificamos si 'alguna vez' fue precursor en el año (para SI)
        // O si 'nunca' fue (para NO)
        const hasPioneered = summary.data.some((d: any) => d.categoria11 === 'SI');

        if (selectedPioneer === 'SI' && !hasPioneered) return false;
        if (selectedPioneer === 'NO' && hasPioneered) return false;
      }

      return true;
    });
  };

  const filteredNames = getFilteredNames();

  // Indicador de carga
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-900">📊 Resumen Anual {year}</h2>

      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Publicador
            </th>
            {months.map((m: string, i: number) => (
              <th key={i} className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[3rem]">
                {m.slice(0, 3)}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredNames.map((nombre: string) => {
            const summary = summaries[nombre];
            if (!summary) return null;

            return (
              <tr
                key={nombre}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onGoToIndividual?.(nombre)}
              >
                {/* Nombre Publicador (Sticky Left) */}
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                  {nombre}
                </td>

                {/* Meses */}
                {months.map((_: string, i: number) => {
                  const monthData = summary.data.find((d: any) => d.month === i + 1);
                  const isPioneer = monthData?.categoria11 === 'SI';


                  // Lógica Visual:
                  // 1. Mostrar puntito verde si participó (Cat9=SI), rojo si no (Cat9=NO).
                  // 2. Mostrar horas (Cat12) SOLO si hizo el precursorado (Cat11=SI).

                  let content = <span className="text-gray-300">-</span>;

                  if (monthData) {
                    const hours = parseFloat(monthData.categoria12 || '0');
                    const participated = monthData.categoria9 === 'SI';

                    // Preparamos el elemento del punto
                    const dot = participated
                      ? <span className="text-green-500 text-xl" title="Participó">●</span>
                      : <span className="text-red-500 text-xl" title="No participó">●</span>;

                    // Preparamos el elemento de las horas (Solo si es precursor)
                    const showHours = isPioneer && hours > 0;

                    content = (
                      <div className="flex items-center justify-center gap-1">
                        {dot}
                        {showHours && <span className="font-bold text-gray-800 text-xs">{hours}</span>}
                      </div>
                    );
                  }

                  return (
                    <td
                      key={i}
                      className={`px-1 py-3 text-center text-sm border-r border-gray-100 ${isPioneer ? 'bg-amber-50' : ''}`}
                    >
                      {content}
                    </td>
                  );
                })}

                {/* Total Anual - Recalculado (Solo horas de precursor) */}
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-blue-900 bg-gray-50">
                  {summary.data.reduce((acc: number, d: any) => {
                    return d.categoria11 === 'SI' ? acc + (parseFloat(d.categoria12) || 0) : acc;
                  }, 0).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ========================================
// COMPONENTE: VISTA INDIVIDUAL
// ========================================
/**
 * Componente que muestra el historial completo de un publicador
 * Permite seleccionar un publicador y ver todos sus registros del año
 */
function IndividualView({ year, months, uniqueCharacters, selectedCharacter, setSelectedCharacter, onGetCharacterYearlySummary }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = todos los meses, 1-12 = mes específico

  // Cargar el resumen cuando se selecciona un publicador o cambia el filtro de mes
  useEffect(() => {
    if (selectedCharacter) {
      const fetchSummary = async () => {
        setLoading(true);
        const data = await onGetCharacterYearlySummary(selectedCharacter, year);

        // Si hay filtro de mes, filtrar los datos
        if (selectedMonth) {
          data.data = data.data.filter((d: any) => d.month === selectedMonth);
        }

        setSummary(data);
        setLoading(false);
      };
      fetchSummary();
    }
  }, [selectedCharacter, year, selectedMonth]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900">👤 Vista Individual</h2>

      {/* Filtros: Publicador y Mes */}
      <div className="flex gap-4 mb-4">
        {/* Selector de publicador */}
        <select
          value={selectedCharacter}
          onChange={(e) => {
            setSelectedCharacter(e.target.value);
            setSelectedMonth(null); // Resetear filtro de mes al cambiar de publicador
          }}
          className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Selecciona un publicador --</option>
          {uniqueCharacters.map((nombre: string) => (
            <option key={nombre} value={nombre}>{nombre}</option>
          ))}
        </select>

        {/* Selector de mes (filtro) */}
        <select
          value={selectedMonth || ''}
          onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
          className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selectedCharacter}
        >
          <option value="">-- Todos los meses --</option>
          {months.map((m: string, i: number) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* Indicador de filtro activo */}
      {selectedMonth && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
          <p className="text-sm text-blue-800">
            <strong>🔍 Filtrando por:</strong> {months[selectedMonth - 1]} {year}
          </p>
        </div>
      )}

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      )}

      {/* Detalles del publicador seleccionado */}
      {selectedCharacter && summary && !loading && (
        <div>
          <h3 className="text-lg font-bold mb-3 text-gray-900">
            {selectedCharacter} - {year}
            {selectedMonth && ` (${months[selectedMonth - 1]})`}
          </h3>

          {/* Tabla con todos los registros del año */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-600 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Mes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Bautizado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Fecha Bautismo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Edad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Género</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Esperanza</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Privilegio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Participa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Estudios</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Precursor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Horas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.data.map((char: any) => (
                  <tr key={char.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{months[char.month - 1]}</td>
                    <td className="px-4 py-3">{char.categoria2}</td>
                    <td className="px-4 py-3">
                      {char.categoria3 ? new Date(char.categoria3).toISOString().split('T')[0] : ''}
                    </td>
                    <td className="px-4 py-3">{char.edad}</td>
                    <td className="px-4 py-3">{char.genero}</td>
                    <td className="px-4 py-3">
                      {char.categoria7 === 'OPCION7.1' ? 'Otras Ovejas' :
                        char.categoria7 === 'OPCION7.2' ? 'Ungido' : ''}
                    </td>
                    <td className="px-4 py-3">
                      {char.categoria8 === 'OPCION8.1' ? 'Publicador' :
                        char.categoria8 === 'OPCION8.2' ? 'Siervo Ministerial' :
                          char.categoria8 === 'OPCION8.3' ? 'Anciano' :
                            char.categoria8 === 'OPCION8.4' ? 'Misionero en Campo' : ''}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {char.categoria13 || ''}
                    </td>
                    <td className="px-4 py-3">{char.categoria9}</td>
                    <td className="px-4 py-3">{char.categoria10 || ''}</td>
                    <td className="px-4 py-3">{char.categoria11 || ''}</td>
                    <td className="px-4 py-3 font-bold text-blue-900">{char.categoria12}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen total del año */}
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">
              Total Anual (Horas){selectedMonth && ` (${months[selectedMonth - 1]})`}
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {summary.data.reduce((acc: number, d: any) => {
                // Si estamos filtrando por mes, solo sumamos si coincide el mes (aunque data ya debería estar filtrado si se usó el filtro en el effect, pero mejor asegurar)
                return d.categoria11 === 'SI' ? acc + (parseFloat(d.categoria12) || 0) : acc;
              }, 0).toFixed(1)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Exportamos el componente principal para usarlo en la aplicación
// ========================================
// COMPONENTE: VISTA MÉTRICAS
// ========================================
// ========================================
// COMPONENTE: LOADER PARA MÉTRICAS ANUALES
function YearlyMetricsLoader({ year, onGetYearlyData }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await onGetYearlyData();
      setData(res || []);
      setLoading(false);
    }
    load();
  }, [year]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Calculando métricas anuales...</div>;

  return (
    <MetricsView
      characters={data}
      title={`Métricas Anuales: ${year}`}
      isYearly={true}
    />
  );
};

// ========================================
// COMPONENTE: VISTA MÉTRICAS (Actualizado)
// ========================================
// COMPONENTE: VISTA MÉTRICAS (Actualizado)
function MetricsView({ characters, title, isYearly = false }: any) {

  const totalRecords = characters.length;
  if (totalRecords === 0) return <div className="p-8 text-center text-gray-500">No hay datos para mostrar métricas</div>;

  // --- LOGICA DIFERENCIADA PARA ANUAL VS MENSUAL ---

  if (isYearly) {
    const uniqueNames = [...new Set(characters.map((c: any) => c.nombre))];
    const uniqueMonths = [...new Set(characters.map((c: any) => c.month))];

    // 1. Promedio Publicadores (Participaron >= 6 meses)
    let activePubs6Months = 0;
    uniqueNames.forEach(name => {
      const userMonths = characters.filter((c: any) => c.nombre === name && c.categoria9 === 'SI');
      if (userMonths.length >= 6) activePubs6Months++;
    });

    // 2. Promedio Precursores (Participaron >= 1 mes como precursor)
    let activePioneers1Month = 0;
    uniqueNames.forEach(name => {
      const userPioneerMonths = characters.filter((c: any) => c.nombre === name && c.categoria11 === 'SI');
      if (userPioneerMonths.length >= 1) activePioneers1Month++;
    });

    // 3. Publicadores No Bautizados (Nunca bautizados en todo el año)
    let unbaptizedCount = 0;
    uniqueNames.forEach(name => {
      const userRecords = characters.filter((c: any) => c.nombre === name);
      // Si en ALGÚN registro aparece como Bautizado (SI), entonces NO cuenta como No Bautizado anual.
      const wasBaptizedAtAnyPoint = userRecords.some((c: any) => c.categoria2 === 'SI');
      if (!wasBaptizedAtAnyPoint && userRecords.length > 0) unbaptizedCount++;
    });

    // 4. Promedio de Estudios por Publicador (Promedio de promedios mensuales)
    let sumOfMonthlyAvgs = 0;
    uniqueMonths.forEach(m => {
      const monthRecords = characters.filter((c: any) => c.month === m);
      const totalStudiesMonth = monthRecords.reduce((acc: number, c: any) => acc + (parseInt(c.categoria10) || 0), 0);
      const totalPubsMonth = monthRecords.length;
      const avgMonth = totalPubsMonth > 0 ? (totalStudiesMonth / totalPubsMonth) : 0;
      sumOfMonthlyAvgs += avgMonth;
    });
    const avgStudiesYearly = uniqueMonths.length > 0 ? (sumOfMonthlyAvgs / uniqueMonths.length) : 0;

    return (
      <div className="bg-white rounded-xl shadow p-6 animate-in fade-in duration-500">
        <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-2">
          📊 {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Promedio Publicadores (>= 6 meses) */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Publicadores Constantes
            </h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-900">{activePubs6Months}</span>
              <span className="text-xs text-blue-600 mb-1">/ {uniqueNames.length} total</span>
            </div>
            <p className="text-xs text-blue-400 mt-1">Participaron ≥ 6 meses</p>
          </div>

          {/* Card 2: Precursores (>= 1 mes) */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <h3 className="text-sm font-medium text-amber-800 mb-1">
              Precursores (Alguna vez)
            </h3>
            <div className="text-3xl font-bold text-amber-900">{activePioneers1Month}</div>
            <p className="text-xs text-amber-600 mt-1">Participaron como precursor ≥ 1 mes</p>
          </div>

          {/* Card 3: No Bautizados Completos */}
          <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-medium text-gray-800 mb-1">
              No Bautizados
            </h3>
            <div className="text-3xl font-bold text-gray-900">{unbaptizedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Nunca bautizados en el año</p>
          </div>

          {/* Card 4: Promedio de Estudios */}
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <h3 className="text-sm font-medium text-green-800 mb-1">Promedio Estudios</h3>
            <div className="text-3xl font-bold text-green-900">{avgStudiesYearly.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">Por publicador (Promedio Anual)</p>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGICA MENSUAL (ORIGINAL) ---

  // 1. Participation
  const participatedRecords = characters.filter((c: any) => c.categoria9 === 'SI');
  const participatedCountTotal = participatedRecords.length;

  // 2. Precursores
  const precursorsRecords = characters.filter((c: any) => c.categoria11 === 'SI');
  const precursorsCountTotal = precursorsRecords.length;

  // 3. Totals
  const bibleStudiesTotal = characters.reduce((acc: number, c: any) => acc + (parseInt(c.categoria10) || 0), 0);
  const hoursTotal = characters.reduce((acc: number, c: any) => acc + (parseFloat(c.categoria12) || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow p-6 animate-in fade-in duration-500">
      <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-2">
        📊 {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Participación */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-1">
            Participación
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-blue-900">{participatedCountTotal}</span>
          </div>
        </div>

        {/* Card 2: Precursores */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <h3 className="text-sm font-medium text-amber-800 mb-1">
            Precursores Activos
          </h3>
          <div className="text-3xl font-bold text-amber-900">{precursorsCountTotal}</div>
        </div>

        {/* Card 3: Estudios */}
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <h3 className="text-sm font-medium text-green-800 mb-1">Total Estudios Bíblicos</h3>
          <div className="text-3xl font-bold text-green-900">{bibleStudiesTotal}</div>
        </div>

        {/* Card 4: Horas */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Total Horas</h3>
          <div className="text-3xl font-bold text-purple-900">{hoursTotal.toFixed(1)}</div>
        </div>
      </div>

      {/* Listado de no participantes (Solo mensual) */}
      <div className="mt-6">
        <h3 className="font-bold text-gray-700 mb-3">⚠️ Publicadores sin participación este mes</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          {characters.filter((c: any) => c.categoria9 === 'NO').length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {characters.filter((c: any) => c.categoria9 === 'NO').map((c: any) => (
                <li key={c.id} className="text-red-700 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {c.nombre}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-600 font-medium">¡Felicidades! Todos participaron este mes.</p>
          )}
        </div>
      </div>
    </div>
  );
};


export default CharacterDatabase;
