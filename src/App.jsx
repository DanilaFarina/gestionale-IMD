import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Page, View, Text, Image, StyleSheet, pdf, PDFViewer, Font } from '@react-pdf/renderer';
import logoIMD from './assets/logo-imd.svg';
// .woff (non .woff2) per compatibilità con il parser font di react-pdf
import ptSerifRegular from '@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff';
import ptSerifItalic from '@fontsource/pt-serif/files/pt-serif-latin-400-italic.woff';
import ptSerifBold from '@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff';
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff';
import garamondRegular from '@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff';
import garamondMedium from '@fontsource/eb-garamond/files/eb-garamond-latin-500-normal.woff';
import garamondSemibold from '@fontsource/eb-garamond/files/eb-garamond-latin-600-normal.woff';
import garamondBold from '@fontsource/eb-garamond/files/eb-garamond-latin-700-normal.woff';
import garamondExtrabold from '@fontsource/eb-garamond/files/eb-garamond-latin-800-normal.woff';
import garamondItalic from '@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff';
import { supabase } from './supabaseClient';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  Music,
  XCircle,
  Check,
  ArrowLeft,
  Save,
  Calculator,
  User,
  Calendar,
  Briefcase,
  Printer,
  Car,
  Users,
  LogOut,
  Mail,
  FileText
} from 'lucide-react';

const PRICE_ROUNDING_STEP = 50;

// Font standard (Times-Roman/Helvetica) non rendono correttamente gli accenti: registriamo font Unicode reali
Font.register({
  family: 'PT Serif',
  fonts: [
    { src: ptSerifRegular, fontWeight: 'normal' },
    { src: ptSerifBold, fontWeight: 'bold' },
    { src: ptSerifItalic, fontStyle: 'italic' },
  ],
});
Font.register({
  family: 'Roboto',
  fonts: [
    { src: robotoRegular, fontWeight: 'normal' },
    { src: robotoBold, fontWeight: 'bold' },
    { src: robotoItalic, fontStyle: 'italic' },
  ],
});
// Font PDF: EB Garamond (elegante). L'alias di famiglia resta 'Heiti' per compatibilità con gli stili esistenti.
// Registriamo tutti i pesi usati dagli stili per evitare fallback a Helvetica su fontWeight non registrati.
Font.register({
  family: 'Heiti',
  fonts: [
    { src: garamondRegular, fontWeight: 'normal' },
    { src: garamondRegular, fontWeight: 400 },
    { src: garamondMedium, fontWeight: 500 },
    { src: garamondSemibold, fontWeight: 600 },
    { src: garamondBold, fontWeight: 'bold' },
    { src: garamondBold, fontWeight: 700 },
    { src: garamondExtrabold, fontWeight: 800 },
    { src: garamondItalic, fontStyle: 'italic' },
  ],
});
// Disabilita la sillabazione automatica (spezza male le parole accentate)
Font.registerHyphenationCallback(word => [word]);

function roundPrice(value, step = PRICE_ROUNDING_STEP) {
  const amount = Number(value) || 0;
  if (amount === 0) return 0;

  const lower = Math.floor(amount / step) * step;
  const upper = lower + step;

  return amount - lower < upper - amount ? lower : upper;
}

// Converte l'SVG del logo in PNG data URL (usato dai PDF)
const svgToPngDataUrl = (svgUrl) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = 1774;
      const height = 1183;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = svgUrl;
  });
}

function formatMultiplier(value) {
  return Number(value || 0).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// ==========================================
// COMPONENTE DASHBOARD
// ==========================================
function Dashboard({ quotes, onApprove, onArchive, onDelete, onEdit, onCreateNew, onPrint, onCreateContract }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tutti');

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          quote.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Tutti' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalApproved = quotes.filter(q => q.status === 'Approvato').length;
  const totalPending = quotes.filter(q => q.status === 'In attesa').length;

  const getRowHighlight = (status) => {
    if (status === 'Approvato') return 'bg-green-50/30';
    if (status === 'Archiviato') return 'opacity-60 bg-gray-50';
    return 'bg-white hover:bg-slate-50';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <img src={logoIMD} alt="IMD Logo" className="h-34 w-auto" />
          <div>
            <h1 className="text-l font-bold tracking-tight text-slate-900">Preventivi Eventi</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Gestisci le tue richieste, calcola i cachet e chiudi le date.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium shadow-sm transition-colors"
        >
          <Plus size={20} />
          Crea Nuovo Preventivo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Preventivi Attivi</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{quotes.filter(q => q.status !== 'Archiviato').length}</p>
          </div>
          <div className="h-9 w-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Music size={18} />
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">In Attesa di Risposta</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{totalPending}</p>
          </div>
          <div className="h-9 w-9 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <Clock size={18} />
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Approvati (Entrati)</p>
            <p className="text-lg font-bold text-green-600 mt-0.5">{totalApproved}</p>
          </div>
          <div className="h-9 w-9 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* Filtri & Tabella */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cerca per cliente, location o ID..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <Filter size={18} className="text-slate-400 mr-1 hidden md:block" />
            {['Tutti', 'In attesa', 'Approvato', 'Archiviato'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Dettagli Evento</th>
                <th className="px-6 py-4">Totale (Escl. IVA)</th>
                <th className="px-3 py-4 text-center">Stato</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className={`transition-colors ${getRowHighlight(quote.status)}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{quote.client}</div>
                      <div className="flex items-center text-slate-500 text-xs mt-1 gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {quote.date}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {quote.location} ({quote.type})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      €{(quote.formData?.contractData?.compensoTotale ?? quote.prezzoLordo ?? quote.total).toLocaleString('it-IT')}
                      {quote.formData?.contractData?.compensoTotale && quote.formData.contractData.compensoTotale !== (quote.prezzoLordo ?? quote.total) && (
                        <span className="text-xs text-slate-400 ml-2">(contratto)</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span title={quote.status} className="inline-flex items-center justify-center">
                        {quote.status === 'Approvato' && <CheckCircle size={20} className="text-green-600" />}
                        {quote.status === 'In attesa' && <Clock size={20} className="text-yellow-500" />}
                        {quote.status === 'Archiviato' && <XCircle size={20} className="text-gray-400" />}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onPrint(quote)}
                          title="Genera PDF Preventivo"
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <Printer size={18} />
                        </button>
                        {quote.status === 'Approvato' && (
                          <button
                            type="button"
                            onClick={() => onCreateContract(quote)}
                            title="Crea Contratto"
                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        {quote.status === 'In attesa' && (
                          <button
                            type="button"
                            onClick={() => onApprove(quote.id)}
                            title="Segna come Approvato"
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(quote.id)}
                          title="Modifica Preventivo"
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        {quote.status !== 'Archiviato' && (
                          <button
                            type="button"
                            onClick={() => onArchive(quote.id)}
                            title="Archivia / Cestina"
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(quote.id)}
                          title="Elimina definitivamente"
                          className="p-2 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-100 p-4 rounded-full mb-3 text-slate-400">
                        <Briefcase size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Nessun preventivo</h3>
                      <p className="text-slate-500 mt-1 max-w-sm">La tua tabella è vuota. Inizia a creare un nuovo preventivo per tracciare i tuoi eventi e incassi.</p>
                      <button
                        type="button"
                        onClick={onCreateNew}
                        className="mt-6 text-blue-600 font-medium hover:text-blue-700 hover:underline"
                      >
                        + Crea il tuo primo preventivo
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE CREAZIONE PREVENTIVO
// ==========================================
// Helper: nome formazione in base al numero di musicisti
const getFormazioneName = (n) => {
  const nomi = { 1: 'Solista', 2: 'Duo', 3: 'Trio', 4: 'Quartetto', 5: 'Quintetto', 6: 'Sestetto', 7: 'Settetto', 8: 'Ottetto' };
  return nomi[n] || `Ensemble (${n} musicisti)`;
};

// Compone un indirizzo in formato italiano (Via nr, CAP Città) dai dettagli Nominatim
const formatItalianAddress = (s) => {
  const a = s?.address || {};
  const road = a.road || a.pedestrian || a.footway || a.neighbourhood || '';
  const via = road ? `${road}${a.house_number ? ' ' + a.house_number : ''}` : '';
  const citta = a.city || a.town || a.village || a.municipality || a.hamlet || '';
  const localita = [a.postcode, citta].filter(Boolean).join(' ');
  const compact = [via, localita].filter(Boolean).join(', ');
  return compact || s?.display_name || '';
};

// Orario complessivo evento: inizio del primo momento – fine dell'ultimo
const getOrarioComplessivo = (momenti = []) => {
  const inizio = momenti.find(m => m?.inizio)?.inizio || '';
  const fine = [...momenti].reverse().find(m => m?.fine)?.fine || '';
  return [inizio, fine].filter(Boolean).join(' – ');
};

// Converte un orario testuale (17:00 / 17.00 / 17) in minuti dalla mezzanotte
const parseTimeToMinutes = (str) => {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2})[:.,hH]?(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

const minutesToTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// Durata in ore tra due orari (gestisce lo scavalco di mezzanotte)
const computeDurataOre = (inizio, fine) => {
  const a = parseTimeToMinutes(inizio);
  const b = parseTimeToMinutes(fine);
  if (a == null || b == null) return '';
  let diff = b - a;
  if (diff <= 0) diff += 1440;
  return (diff / 60).toLocaleString('it-IT', { maximumFractionDigits: 1 });
};

// Sottrae un'ora a un orario testuale (per il montaggio)
const subtractOneHour = (str) => {
  const a = parseTimeToMinutes(str);
  return a == null ? '' : minutesToTime(a - 60);
};

function QuoteForm({ onCancel, onSave, initialData }) {
  // Stato del form
  const defaults = {
    client: '',
    date: '',
    address: '',
    nomeLocation: '',
    type: 'Matrimonio',
    acconto: 0,
    numeroOspiti: '',
    numPasti: 3,
    numMomenti: 1,
    momenti: [{ titolo: '', descrizione: '', inizio: '', fine: '' }],
    numMusicisti: 3,
    cachetMusicista: 200,
    costoCerimonia: 0,
    costoExtra: 0,
    numImpianti: 1,
    costoImpianto: 50,
    costoDj: 0,
    usaBraniRichiesta: false,
    costoBraniRichiesta: 50,
    usaCoordinator: true,
    costoCoordinator: 50,
    // Trasferta
    usaTrasferta: true,
    distanzaKm: 0,
    prezzoBenzina: 1.95,
    consumoMedio: 14,
    numMacchine: 1,
    andataRitorno: true,
    inclPedaggio: true,
    pedaggioManuale: 0,
    pedaggioAutoCalc: true,
    usaPernottamento: false,
    numNotti: 1,
    prezzoPerNotte: 80,
    // Aggiustamenti
    usaCommWP: false,
    percCommWP: 10,
    usaCommFTM: false,
    percCommFTM: 18,
    usaExtraSconto: false,
    percExtraSconto: 5,
    usaMaggAgenzia: false,
    percMaggAgenzia: 20,
    sconto: 0.65
  };
  const [formData, setFormData] = useState(initialData ? { ...defaults, ...initialData } : defaults);

  const [distanzaLoading, setDistanzaLoading] = useState(false);
  const [distanzaError, setDistanzaError] = useState('');
  const [manualDistanceOverride, setManualDistanceOverride] = useState(Boolean(initialData && Number(initialData.distanzaKm) > 0));
  const [prezzoAutoFetched, setPrezzoAutoFetched] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suppressSuggestRef = useRef(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const logoPngRef = useRef('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value);

    if (name === 'distanzaKm') {
      setManualDistanceOverride(true);
    }

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const resetDistanzaAutomatica = () => {
    setManualDistanceOverride(false);
    setDistanzaError('');
    if (formData.address) {
      calcolaDistanza(formData.address);
    } else {
      setFormData(prev => ({ ...prev, distanzaKm: 0 }));
    }
  };

  const handleMomentiCount = (delta) => {
    setFormData(prev => {
      const n = Math.max(1, prev.numMomenti + delta);
      const momenti = [...(prev.momenti || [])];
      while (momenti.length < n) momenti.push({ titolo: '', descrizione: '', inizio: '', fine: '' });
      return { ...prev, numMomenti: n, momenti: momenti.slice(0, n) };
    });
  };

  const handleMomentoField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      momenti: prev.momenti.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }));
  };

  // Auto-fetch prezzo benzina dal MIMIT
  useEffect(() => {
    const fetchPrezzoBenzina = async () => {
      try {
        const res = await fetch(
          'https://api.allorigins.win/raw?url=' +
          encodeURIComponent('https://dgsaie.mise.gov.it/open_data_export.php?export-id=1&export-type=csv')
        );
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split('\n');
        for (const line of lines) {
          const lower = line.toLowerCase();
          if (lower.includes('benzina') && !lower.includes('gpl')) {
            const matches = line.match(/\d+[.,]\d{2,3}/g);
            if (matches) {
              const price = parseFloat(matches[0].replace(',', '.'));
              if (price > 1.0 && price < 3.0) {
                setFormData(prev => ({ ...prev, prezzoBenzina: price }));
                setPrezzoAutoFetched(true);
                return;
              }
            }
          }
        }
      } catch {
        // Mantiene il valore di default
      }
    };
    fetchPrezzoBenzina();
  }, []);

  // Calcolo distanza automatico da Firenze
  const calcolaDistanza = useCallback(async (destinazione) => {
    if (!destinazione || destinazione.trim().length < 3) {
      setManualDistanceOverride(false);
      setFormData(prev => ({ ...prev, distanzaKm: 0 }));
      setDistanzaError('');
      return;
    }
    setDistanzaLoading(true);
    setDistanzaError('');
    try {
      const [origRes, destRes] = await Promise.all([
        fetch('https://nominatim.openstreetmap.org/search?q=Firenze%2C+Italia&format=json&limit=1'),
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinazione + ', Italia')}&format=json&limit=1`)
      ]);
      const [origData, destData] = await Promise.all([origRes.json(), destRes.json()]);
      if (!origData.length || !destData.length) {
        setDistanzaError('Indirizzo non trovato');
        return;
      }
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origData[0].lon},${origData[0].lat};${destData[0].lon},${destData[0].lat}?overview=false`
      );
      const routeData = await routeRes.json();
      if (routeData.routes?.length > 0) {
        const km = Math.round(routeData.routes[0].distance / 1000);
        setManualDistanceOverride(false);
        setFormData(prev => ({ ...prev, distanzaKm: km }));
      } else {
        setDistanzaError('Percorso non trovato');
      }
    } catch (err) {
      console.error('Errore calcolo distanza:', err);
      setDistanzaError('Errore di connessione');
    } finally {
      setDistanzaLoading(false);
    }
  }, []);

  // Debounce: ricalcola quando cambia la location
  useEffect(() => {
    if (!formData.usaTrasferta) {
      setDistanzaError('');
      return;
    }

    if (manualDistanceOverride && Number(formData.distanzaKm) > 0) {
      setDistanzaError('');
      return;
    }

    const timer = setTimeout(() => {
      if (formData.address) {
        calcolaDistanza(formData.address);
      } else {
        setFormData(prev => ({ ...prev, distanzaKm: 0 }));
        setDistanzaError('');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData.address, formData.usaTrasferta, formData.distanzaKm, manualDistanceOverride, calcolaDistanza]);

  // Autocompletamento indirizzo (Nominatim) mentre l'utente digita
  useEffect(() => {
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false;
      return;
    }
    const q = (formData.address || '').trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Italia')}&format=json&limit=5&addressdetails=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setAddressSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.address]);

  const selectAddressSuggestion = (s) => {
    suppressSuggestRef.current = true;
    setFormData(prev => ({ ...prev, address: formatItalianAddress(s) }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  // Calcoli in tempo reale (Il "Riepilogo Interno" / Excel)
  const calc = useMemo(() => {
    const n = v => Number(v) || 0;
    const costiMusicisti = n(formData.numMusicisti) * n(formData.cachetMusicista);
    const costoCerimonia = n(formData.costoCerimonia);
    const costoExtra = n(formData.costoExtra);
    const costiImpianti = n(formData.numImpianti) * n(formData.costoImpianto);
    const costoDj = n(formData.costoDj);
    const costoBraniRichiesta = formData.usaBraniRichiesta ? n(formData.costoBraniRichiesta) : 0;
    const costiCoordinator = formData.usaCoordinator ? n(formData.costoCoordinator) : 0;

    // Trasferta
    const distanzaEffettiva = formData.andataRitorno ? n(formData.distanzaKm) * 2 : n(formData.distanzaKm);
    const litriNecessari = n(formData.consumoMedio) > 0 ? distanzaEffettiva / n(formData.consumoMedio) : 0;
    const costoCarburante = formData.usaTrasferta
      ? Math.round(litriNecessari * n(formData.prezzoBenzina) * n(formData.numMacchine))
      : 0;

    // Pedaggio autostradale (~0.08 €/km media autostrade italiane)
    const pedaggioStimato = formData.usaTrasferta && formData.inclPedaggio
      ? (formData.pedaggioAutoCalc
          ? Math.round(distanzaEffettiva * 0.08 * n(formData.numMacchine))
          : n(formData.pedaggioManuale))
      : 0;

    const costoTrasferta = formData.usaTrasferta ? costoCarburante + pedaggioStimato : 0;

    // Pernottamento
    const costoPernottamento = formData.usaPernottamento
      ? n(formData.numNotti) * n(formData.prezzoPerNotte) * n(formData.numMusicisti)
      : 0;

    // Prezzo servizi (base)
    const totaleCostiBase = costiMusicisti + costoCerimonia + costoExtra + costiImpianti + costoDj + costoBraniRichiesta + costiCoordinator;

    // 1. Maggiorazione agenzia come divisore sui servizi
    const prezzoServiziMaggiorato = formData.usaMaggAgenzia
      ? totaleCostiBase / (1 - n(formData.percMaggAgenzia) / 100)
      : totaleCostiBase;
    const maggiorazioneAgenziaVal = prezzoServiziMaggiorato - totaleCostiBase;

    // 2. Prezzo finale = servizi maggiorati + trasferta, FTM prima poi WP
    let prezzoFinaleRaw = prezzoServiziMaggiorato + costoTrasferta + costoPernottamento;
    const preCommFTM = prezzoFinaleRaw;
    if (formData.usaCommFTM) prezzoFinaleRaw = prezzoFinaleRaw / (1 - n(formData.percCommFTM) / 100);
    const commissioneFTMVal = prezzoFinaleRaw - preCommFTM;
    const preCommWP = prezzoFinaleRaw;
    if (formData.usaCommWP) prezzoFinaleRaw = prezzoFinaleRaw / (1 - n(formData.percCommWP) / 100);
    const commissioneWPVal = prezzoFinaleRaw - preCommWP;

    // 3. Tutti i prezzi finali vengono approssimati al multiplo di 50 piu vicino.
    const prezzoFinale = roundPrice(prezzoFinaleRaw);
    const prezzoLordo = roundPrice(prezzoFinale / 0.6);
    const scontoPerTe = roundPrice(prezzoLordo * n(formData.sconto));
    const margineAgenzia = prezzoFinale - totaleCostiBase - costoTrasferta - costoPernottamento;

    return {
      costiMusicisti,
      costoCerimonia,
      costoExtra,
      costiImpianti,
      costoDj,
      costoBraniRichiesta,
      costiCoordinator,
      distanzaEffettiva,
      litriNecessari,
      costoCarburante,
      pedaggioStimato,
      costoTrasferta,
      costoPernottamento,
      totaleCostiBase,
      maggiorazioneAgenziaVal,
      commissioneWPVal,
      commissioneFTMVal,
      prezzoFinale,
      prezzoLordo,
      scontoPerTe,
      margineAgenzia
    };
  }, [formData]);

  const buildQuote = () => ({
    id: formData._editId || `PRV-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    client: formData.client || 'Cliente Sconosciuto',
    type: formData.type,
    date: formData.date || 'Da definire',
    location: formData.address || 'Da definire',
    total: calc.prezzoFinale,
    prezzoLordo: calc.prezzoLordo,
    scontoPerTe: calc.scontoPerTe,
    status: formData._editStatus || 'In attesa',
    formData: { ...formData }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.client) return alert("Inserisci almeno il nome del cliente!");
    onSave(buildQuote());
  };

  const handleDownloadPdf = async () => {
    if (!formData.client) return alert("Inserisci almeno il nome del cliente!");
    setPdfGenerating(true);
    try {
      if (!logoPngRef.current) {
        logoPngRef.current = await svgToPngDataUrl(logoIMD);
      }
      const quote = buildQuote();
      const fd = quote.formData;
      const doc = (
        <QuotePDF
          quote={quote}
          prezzoLordo={calc.prezzoLordo}
          scontoperTe={calc.scontoPerTe}
          logoPng={logoPngRef.current}
          band={fd.band || ''}
          acconto={Number(fd.acconto || 0)}
          fd={fd}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Preventivo_${quote.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore generazione PDF:', err);
      alert('Errore nella generazione del PDF: ' + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadInternalReport = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = 14;

    const ensureSpace = (needed = 7) => {
      if (y + needed > pageHeight - 12) {
        pdf.addPage();
        y = 14;
      }
    };

    const addTitle = (text) => {
      ensureSpace(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(text, margin, y);
      y += 8;
    };

    const addSection = (text) => {
      ensureSpace(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(text, margin, y);
      y += 6;
    };

    const addLine = (label, value) => {
      const text = `${label}: ${value ?? '-'}`;
      const wrapped = pdf.splitTextToSize(text, contentWidth);
      ensureSpace(5 + wrapped.length * 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 4 + 1;
    };

    const euro = (value) =>
      `EUR ${Number(value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const reportId = formData._editId || `DRAFT-${new Date().toISOString().slice(0, 10)}`;

    addTitle('REPORT INTERNO PREVENTIVO');
    addLine('ID Report', reportId);
    addLine('Generato il', new Date().toLocaleString('it-IT'));

    y += 2;
    addSection('Dettagli Generali');
    addLine('Cliente / Sposi', formData.client || '-');
    addLine('Tipo Evento', formData.type || '-');
    addLine('Data Evento', formData.date || '-');
    addLine('Nome Location', formData.nomeLocation || '-');
    addLine('Indirizzo', formData.address || '-');
    addLine('Numero Momenti', formData.numMomenti);
    if (formData.momenti?.length) {
      formData.momenti.forEach((m, i) => {
        addLine(`  Momento ${i + 1}`, m.titolo || '-');
        if (m.descrizione) addLine('', m.descrizione);
      });
    }
    y += 2;
    addSection('Servizio Musicale e Staffing');
    addLine('Numero Musicisti', formData.numMusicisti);
    addLine('Numero Musicisti', formData.numMusicisti);
    addLine('Costo Cerimonia', euro(formData.costoCerimonia));
    addLine('Costo Extra', euro(formData.costoExtra));
    addLine('Numero Impianti Audio', formData.numImpianti);
    addLine('Costo DJ', euro(formData.costoDj));
    addLine('Brani su Richiesta', formData.usaBraniRichiesta ? `SI (${euro(formData.costoBraniRichiesta)})` : 'NO');
    addLine('Event Coordinator', formData.usaCoordinator ? `SI (${euro(formData.costoCoordinator)})` : 'NO');

    y += 2;
    addSection('Trasferta e Pernottamento');
    addLine('Distanza', `${formData.distanzaKm} km`);
    addLine('Andata/Ritorno', formData.andataRitorno ? 'SI' : 'NO');
    addLine('Numero Macchine', formData.numMacchine);
    addLine('Prezzo Benzina', `${euro(formData.prezzoBenzina)} / L`);
    addLine('Consumo Medio', `${formData.consumoMedio} km/L`);
    addLine('Pedaggio', formData.inclPedaggio ? (formData.pedaggioAutoCalc ? `Stimato (${euro(calc.pedaggioStimato)})` : `Manuale (${euro(formData.pedaggioManuale)})`) : 'Non incluso');
    addLine('Costo Carburante', euro(calc.costoCarburante));
    addLine('Costo Trasferta Totale', euro(calc.costoTrasferta));
    addLine('Pernottamento', formData.usaPernottamento ? `SI (${formData.numNotti} notti x ${euro(formData.prezzoPerNotte)})` : 'NO');
    addLine('Costo Pernottamento Totale', euro(calc.costoPernottamento));

    y += 2;
    addSection('Commissioni e Sconti');
    addLine('Maggiorazione Agenzia', formData.usaMaggAgenzia ? `${formData.percMaggAgenzia}% (+${euro(Math.round(calc.maggiorazioneAgenziaVal))})` : 'NO');
    addLine('Commissione Wedding Planner', formData.usaCommWP ? `${formData.percCommWP}% (+${euro(Math.round(calc.commissioneWPVal))})` : 'NO');
    addLine('Commissione Fix The Music', formData.usaCommFTM ? `${formData.percCommFTM}% (+${euro(Math.round(calc.commissioneFTMVal))})` : 'NO');

    y += 2;
    addSection('Riepilogo Economico');
    addLine('Totale Costi Base', euro(calc.totaleCostiBase));
    addLine('① Prezzo Finale Cliente', `${euro(calc.prezzoFinale)} + IVA 22%`);
    addLine('② Prezzo Lordo (÷0.6)', `${euro(calc.prezzoLordo)} + IVA 22%`);
    addLine(`③ Sconto per Te (×${formatMultiplier(formData.sconto)})`, `${euro(calc.scontoPerTe)} + IVA 22%`);
    addLine('Margine Agenzia Stimato', euro(Math.round(calc.margineAgenzia)));

    pdf.save(`Report_Interno_${reportId}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{initialData ? 'Modifica Preventivo' : 'Componi Preventivo'}</h2>
          <p className="text-slate-500 text-sm">Inserisci i parametri. Il calcolo si aggiorna in tempo reale.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM INSERIMENTO PARAMETRI (Sinistra - 2 colonne) */}
        <div className="lg:col-span-2 space-y-6">
          <form id="quote-form" onSubmit={handleSubmit} onKeyDown={e => e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.preventDefault()} className="space-y-6">

            {/* ── PARTE 1: Informazioni Evento ── solo descrittive, non influenzano il prezzo */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-slate-500"/> Informazioni Evento
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Solo PDF — non influenza il prezzo</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Sposi</label>
                    <input type="text" name="client" value={formData.client} onChange={handleChange} placeholder="es. Marco & Silvia" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Evento</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                      <option value="Matrimonio">Matrimonio</option>
                      <option value="Aziendale">Evento Aziendale</option>
                      <option value="Compleanno">Festa Privata / Compleanno</option>
                      <option value="Capodanno">Capodanno</option>
                      <option value="Concerto">Concerto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Evento</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Location</label>
                    <input type="text" name="nomeLocation" value={formData.nomeLocation} onChange={handleChange} placeholder="es. Villa Bianca" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Via, nr civico, CAP, Città</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="es. Via Roma 1, 53100 Siena"
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                        {addressSuggestions.map((s, i) => (
                          <li key={s.place_id || i}>
                            <button
                              type="button"
                              onMouseDown={() => selectAddressSuggestion(s)}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
                            >
                              {formatItalianAddress(s)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Acconto (€)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                      <input type="number" name="acconto" min="0" value={formData.acconto} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Appare nel PDF come caparra confirmatoria</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ospiti Stimati</label>
                    <input type="number" name="numeroOspiti" min="0" value={formData.numeroOspiti} onChange={handleChange} placeholder="es. 100" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Numero Pasti</label>
                    <input type="number" name="numPasti" min="0" value={formData.numPasti} onChange={handleChange} placeholder="es. 3" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    <p className="text-xs text-slate-500 mt-1">Pasti per gli artisti (Vitto nelle condizioni PDF)</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">Momenti Musicali</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleMomentiCount(-1)} className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition-colors">−</button>
                        <span className="w-5 text-center font-semibold text-slate-800">{formData.numMomenti}</span>
                        <button type="button" onClick={() => handleMomentiCount(1)} className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition-colors">+</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(formData.momenti || []).map((m, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Momento {i + 1}</p>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">Dalle:</label>
                              <input
                                type="text"
                                value={m.inizio || ''}
                                onChange={e => handleMomentoField(i, 'inizio', e.target.value)}
                                placeholder="es. 17:00"
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
                              />
                              <label className="text-xs text-slate-500">Alle:</label>
                              <input
                                type="text"
                                value={m.fine || ''}
                                onChange={e => handleMomentoField(i, 'fine', e.target.value)}
                                placeholder="es. 19:00"
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={m.titolo}
                            onChange={e => handleMomentoField(i, 'titolo', e.target.value)}
                            placeholder="es. Cerimonia, Cocktail, Cena..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <textarea
                            rows={2}
                            value={m.descrizione}
                            onChange={e => handleMomentoField(i, 'descrizione', e.target.value)}
                            placeholder="Breve descrizione del momento musicale"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PARTE 2: Calcolo Prezzo ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 flex items-center gap-2">
                <h3 className="text-base font-semibold text-blue-800 flex items-center gap-2">
                  <Calculator size={16} className="text-blue-600"/> Calcolo Prezzo
                </h3>
              </div>
              <div className="p-6 space-y-6">

                {/* Servizio Musicale */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Music size={14} className="text-blue-400"/> Servizio Musicale & Staffing
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Numero Musicisti</label>
                      <input type="number" name="numMusicisti" min="1" value={formData.numMusicisti} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cachet per Musicista (€)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                        <input type="number" name="cachetMusicista" min="0" value={formData.cachetMusicista} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Regola in base ai momenti (es. 200€ 1 momento, 300€ 2 momenti)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Costo Cerimonia (€)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                        <input type="number" name="costoCerimonia" min="0" value={formData.costoCerimonia} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Costo Extra (€)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                        <input type="number" name="costoExtra" min="0" value={formData.costoExtra} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Num. Impianti Audio</label>
                      <input type="number" name="numImpianti" min="0" value={formData.numImpianti} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Costo DJ (€)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                        <input type="number" name="costoDj" min="0" value={formData.costoDj} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Lascia 0 se non previsto</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="usaBraniRichiesta" checked={formData.usaBraniRichiesta} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Brani su Richiesta</span>
                      </label>
                    </div>
                    {formData.usaBraniRichiesta && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Costo Brani su Richiesta (€)</label>
                        <input type="number" name="costoBraniRichiesta" min="0" value={formData.costoBraniRichiesta} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="usaCoordinator" checked={formData.usaCoordinator} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Event Coordinator</span>
                      </label>
                    </div>
                    {formData.usaCoordinator && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Costo Coordinator (€)</label>
                        <input type="number" name="costoCoordinator" min="0" value={formData.costoCoordinator} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trasferta */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Car size={14} className="text-blue-400"/> Trasferta
                  </h4>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input type="checkbox" name="usaTrasferta" checked={formData.usaTrasferta} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Includi spese di trasferta / macchina</span>
                    </label>

                    {formData.usaTrasferta && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            Distanza da Firenze → {formData.address || '...'}
                          </span>
                          {distanzaLoading && (
                            <span className="text-xs text-blue-600 animate-pulse">Calcolo in corso...</span>
                          )}
                        </div>
                        {distanzaError ? (
                          <p className="text-sm text-red-600">{distanzaError}</p>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-900">{formData.distanzaKm} km</span>
                            <span className="text-xs text-blue-600">
                              ({formData.andataRitorno ? `${formData.distanzaKm * 2} km A/R` : 'solo andata'})
                            </span>
                          </div>
                        )}
                        {manualDistanceOverride && Number(formData.distanzaKm) > 0 && (
                          <button
                            type="button"
                            onClick={resetDistanzaAutomatica}
                            className="mt-2 text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                          >
                            Ricalcola distanza automatica
                          </button>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                          <input type="checkbox" name="andataRitorno" checked={formData.andataRitorno} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                          <span className="text-xs font-medium text-blue-700">Andata e Ritorno</span>
                        </label>
                        <p className="text-xs text-blue-500 mt-2">Distanza calcolata automaticamente via OpenStreetMap. Puoi sovrascriverla sotto.</p>
                      </>
                    )}
                  </div>

                  {formData.usaTrasferta && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Distanza (km) — override</label>
                          <input type="number" name="distanzaKm" min="0" value={formData.distanzaKm} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Num. Macchine</label>
                          <input type="number" name="numMacchine" min="1" value={formData.numMacchine} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo Benzina (€/L)</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                            <input type="number" name="prezzoBenzina" min="0" step="0.01" value={formData.prezzoBenzina} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {prezzoAutoFetched ? '✓ Aggiornato automaticamente (MIMIT)' : 'Prezzo medio di default — aggiorna manualmente se necessario'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Consumo Medio (km/L)</label>
                          <input type="number" name="consumoMedio" min="1" step="0.5" value={formData.consumoMedio} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                      </div>

                      <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                          <input type="checkbox" name="inclPedaggio" checked={formData.inclPedaggio} onChange={handleChange} className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500" />
                          <span className="text-sm font-medium text-amber-800">Includi Pedaggio Autostradale</span>
                        </label>
                        {formData.inclPedaggio && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="pedaggioAutoCalc" checked={formData.pedaggioAutoCalc} onChange={() => setFormData(prev => ({ ...prev, pedaggioAutoCalc: true }))} className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500" />
                                <span className="text-sm text-amber-800">Stima automatica (~0.08 €/km)</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="pedaggioAutoCalc" checked={!formData.pedaggioAutoCalc} onChange={() => setFormData(prev => ({ ...prev, pedaggioAutoCalc: false }))} className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500" />
                                <span className="text-sm text-amber-800">Inserisci manualmente</span>
                              </label>
                            </div>
                            {!formData.pedaggioAutoCalc && (
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pedaggio Totale (€)</label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                                  <input type="number" name="pedaggioManuale" min="0" step="0.5" value={formData.pedaggioManuale} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Verifica su autostrade.it o ViaMichelin per il costo esatto</p>
                              </div>
                            )}
                            {calc.pedaggioStimato > 0 && (
                              <div className="flex justify-between items-center text-sm text-amber-800 bg-amber-100/50 p-2 rounded-lg">
                                <span>
                                  {formData.pedaggioAutoCalc
                                    ? `${calc.distanzaEffettiva} km × 0.08 €/km × ${formData.numMacchine} macch.`
                                    : 'Importo manuale'}
                                </span>
                                <span className="font-semibold">€ {calc.pedaggioStimato.toLocaleString('it-IT')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input type="checkbox" name="usaPernottamento" checked={formData.usaPernottamento} onChange={handleChange} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                      <span className="text-sm font-medium text-purple-800">Pernottamento</span>
                    </label>
                    {formData.usaPernottamento && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Numero Notti</label>
                          <input type="number" name="numNotti" min="1" value={formData.numNotti} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo per Notte (€)</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                            <input type="number" name="prezzoPerNotte" min="0" value={formData.prezzoPerNotte} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                          </div>
                        </div>
                        {calc.costoPernottamento > 0 && (
                          <div className="md:col-span-2 flex justify-between items-center text-sm text-purple-800 bg-purple-100/50 p-2 rounded-lg">
                            <span>{formData.numNotti} notti × €{formData.prezzoPerNotte} × {formData.numMusicisti} musicisti</span>
                            <span className="font-semibold">€ {calc.costoPernottamento.toLocaleString('it-IT')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(calc.costoTrasferta > 0 || calc.costoPernottamento > 0) && (
                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 space-y-1">
                      {calc.costoTrasferta > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span>Carburante: {calc.distanzaEffettiva} km ÷ {formData.consumoMedio} km/L × {formData.prezzoBenzina}€/L × {formData.numMacchine}</span>
                            <span className="font-medium text-slate-700">€ {calc.costoCarburante.toLocaleString('it-IT')}</span>
                          </div>
                          {calc.pedaggioStimato > 0 && (
                            <div className="flex justify-between">
                              <span>Pedaggio{formData.pedaggioAutoCalc ? ' (stimato)' : ''}</span>
                              <span className="font-medium text-slate-700">€ {calc.pedaggioStimato.toLocaleString('it-IT')}</span>
                            </div>
                          )}
                        </>
                      )}
                      {calc.costoPernottamento > 0 && (
                        <div className="flex justify-between">
                          <span>Pernottamento: {formData.numNotti} notti × €{formData.prezzoPerNotte} × {formData.numMusicisti} musicisti</span>
                          <span className="font-medium text-slate-700">€ {calc.costoPernottamento.toLocaleString('it-IT')}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800">
                        <span>Totale Trasferta + Pernottamento</span>
                        <span>€ {(calc.costoTrasferta + calc.costoPernottamento).toLocaleString('it-IT')}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ── PARTE 3: Spese e Commissioni ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
              <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center gap-2">
                <h3 className="text-base font-semibold text-amber-800 flex items-center gap-2">
                  <Calculator size={16} className="text-amber-600"/> Spese e Commissioni
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="usaCommWP" checked={formData.usaCommWP} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Commissione Wedding Planner</span>
                    </label>
                    {formData.usaCommWP && (
                      <div className="flex items-center gap-2">
                        <input type="number" name="percCommWP" min="0" max="100" value={formData.percCommWP} onChange={handleChange} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="usaCommFTM" checked={formData.usaCommFTM} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Commissione Fix The Music</span>
                    </label>
                    {formData.usaCommFTM && (
                      <div className="flex items-center gap-2">
                        <input type="number" name="percCommFTM" min="0" max="100" value={formData.percCommFTM} onChange={handleChange} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="usaMaggAgenzia" checked={formData.usaMaggAgenzia} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Maggiorazione Agenzia</span>
                    </label>
                    {formData.usaMaggAgenzia && (
                      <div className="flex items-center gap-2">
                        <input type="number" name="percMaggAgenzia" min="0" max="100" value={formData.percMaggAgenzia} onChange={handleChange} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Sconto per Te</p>
                      <p className="text-xs text-slate-500">Moltiplicatore applicato al prezzo lordo.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" name="sconto" min="0" max="1" step="0.01" value={formData.sconto} onChange={handleChange} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                      <span className="text-sm text-slate-500">x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* PANNELLO DI RIEPILOGO INTERNO (Destra) */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg sticky top-6">
            <h3 className="text-xl font-bold mb-4 border-b border-slate-600 pb-3">Riepilogo Interno</h3>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between items-center text-slate-300">
                <span>Cachet Musicisti ({formData.numMusicisti})</span>
                <span>€ {calc.costiMusicisti.toLocaleString('it-IT')}</span>
              </div>
              {calc.costoCerimonia > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Costo Cerimonia</span>
                  <span>€ {calc.costoCerimonia.toLocaleString('it-IT')}</span>
                </div>
              )}
              {calc.costoExtra > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Costo Extra</span>
                  <span>€ {calc.costoExtra.toLocaleString('it-IT')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-300">
                <span>Impianti Audio ({formData.numImpianti})</span>
                <span>€ {calc.costiImpianti.toLocaleString('it-IT')}</span>
              </div>
              {calc.costoDj > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>DJ</span>
                  <span>€ {calc.costoDj.toLocaleString('it-IT')}</span>
                </div>
              )}
              {calc.costoBraniRichiesta > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Brani su Richiesta</span>
                  <span>€ {calc.costoBraniRichiesta.toLocaleString('it-IT')}</span>
                </div>
              )}
              {formData.usaCoordinator && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Event Coordinator</span>
                  <span>€ {calc.costiCoordinator.toLocaleString('it-IT')}</span>
                </div>
              )}
              <div className="border-t border-slate-600 pt-2 flex justify-between items-center font-medium text-slate-200">
                <span>Costi Servizi</span>
                <span>€ {calc.totaleCostiBase.toLocaleString('it-IT')}</span>
              </div>

              {formData.usaTrasferta && (
                <>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Carburante ({formData.numMacchine} macch.)</span>
                    <span>€ {calc.costoCarburante.toLocaleString('it-IT')}</span>
                  </div>
                  {calc.pedaggioStimato > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Pedaggio{formData.pedaggioAutoCalc ? ' (stima)' : ''}</span>
                      <span>€ {calc.pedaggioStimato.toLocaleString('it-IT')}</span>
                    </div>
                  )}
                </>
              )}
              {calc.costoPernottamento > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Pernottamento ({formData.numNotti}n × {formData.numMusicisti}mus.)</span>
                  <span>€ {calc.costoPernottamento.toLocaleString('it-IT')}</span>
                </div>
              )}

              {calc.maggiorazioneAgenziaVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400 pt-2">
                  <span>Magg. Agenzia ({formData.percMaggAgenzia}%)</span>
                  <span>+ € {Math.round(calc.maggiorazioneAgenziaVal).toLocaleString('it-IT')}</span>
                </div>
              )}
              {calc.commissioneWPVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Comm. Wedding Planner ({formData.percCommWP}%)</span>
                  <span>+ € {Math.round(calc.commissioneWPVal).toLocaleString('it-IT')}</span>
                </div>
              )}
              {calc.commissioneFTMVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Comm. Fix The Music ({formData.percCommFTM}%)</span>
                  <span>+ € {Math.round(calc.commissioneFTMVal).toLocaleString('it-IT')}</span>
                </div>
              )}
            </div>

            {/* TOTALI FINALI */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-4">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">① Prezzo Finale Cliente</p>
                <div className="text-3xl font-bold text-white">
                  € {calc.prezzoFinale.toLocaleString('it-IT')} <span className="text-lg font-medium text-slate-300">+ IVA 22%</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">② Prezzo Lordo (÷ 0.6)</p>
                <div className="text-2xl font-bold text-indigo-300">
                  € {calc.prezzoLordo.toLocaleString('it-IT')} <span className="text-base font-medium text-indigo-200">+ IVA 22%</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">③ Sconto per Te (× {formatMultiplier(formData.sconto)})</p>
                <div className="text-2xl font-bold text-emerald-300">
                  € {calc.scontoPerTe.toLocaleString('it-IT')} <span className="text-base font-medium text-emerald-200">+ IVA 22%</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                <span className="text-sm text-slate-400">Tuo Margine Stimato</span>
                <span className={`font-bold ${calc.margineAgenzia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  € {calc.margineAgenzia.toLocaleString('it-IT', {maximumFractionDigits: 0})}
                </span>
              </div>
            </div>

            <button 
              type="submit"
              form="quote-form"
              className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-sm transition-colors"
            >
              <Save size={20} />
              Salva Preventivo
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-70"
            >
              <Printer size={20} />
              {pdfGenerating ? 'Generazione...' : 'Scarica PDF Preventivo'}
            </button>
            <button
              type="button"
              onClick={handleDownloadInternalReport}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold shadow-sm transition-colors"
            >
              <Printer size={20} />
              Scarica Report Interno
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              Il preventivo verrà salvato con stato "In attesa" nella Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DOCUMENTO PDF PREVENTIVO (vettoriale)
// ==========================================
const PDF_FS = 12; // dimensione unica per tutte le scritte dei PDF (preventivo + contratto)
const pdfStyles = StyleSheet.create({
  page: { paddingHorizontal: 55, paddingVertical: 55, fontFamily: 'Heiti', color: '#000000', fontSize: PDF_FS },
  logo: { width: 200, height: 133, alignSelf: 'center', marginBottom: 4, objectFit: 'contain' },
  infoBlock: { marginBottom: 40 },
  infoLine: { fontFamily: 'Heiti', fontSize: PDF_FS, marginBottom: 3, color: '#000000' },
  infoLabel: { color: '#000000' },
  sectionTitle: { fontFamily: 'Heiti', fontSize: PDF_FS, letterSpacing: 2, textTransform: 'uppercase', color: '#000000', marginBottom: 18 },
  serviceRow: { flexDirection: 'row', marginBottom: 12 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#a8a29e', marginTop: 6, marginRight: 10 },
  serviceTitle: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  serviceDesc: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e7e5e4', marginVertical: 32 },
  ecoBox: { backgroundColor: '#fafaf9', padding: 16 },
  ecoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ecoLabel: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  ecoLabelStrong: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', fontWeight: 'bold' },
  ecoValue: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  ecoValueBig: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  ecoDivider: { height: 1, backgroundColor: '#e7e5e4', marginVertical: 10 },
  note: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#f5f5f4', fontFamily: 'Heiti', fontSize: PDF_FS, color: '#6f4526', textAlign: 'center', lineHeight: 1.5 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerLine: { width: 32, height: 1, backgroundColor: '#d6d3d1', marginBottom: 12 },
  footerBrand: { fontFamily: 'Heiti', fontSize: PDF_FS, letterSpacing: 3, textTransform: 'uppercase', color: '#000000' },
  ecoSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  ecoSubLabel: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  ecoSubValue: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  docMeta: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#6f4526', textAlign: 'center', marginBottom: 24 },
  sectionHeader: { fontFamily: 'Heiti', fontSize: PDF_FS, letterSpacing: 1.5, color: '#6f4526', marginBottom: 10, marginTop: 20, borderBottomWidth: 0.5, borderBottomColor: '#e7e5e4', paddingBottom: 4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 6, paddingRight: 8 },
  infoItemFull: { width: '100%', marginBottom: 6 },
  fieldLabel: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#6f4526', marginBottom: 1 },
  fieldValue: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000' },
  momentoBlock: { marginBottom: 12, paddingLeft: 10, borderLeftWidth: 1.5, borderLeftColor: '#e7e5e4' },
  momentoRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  momentoBullet: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#6f4526', width: 12 },
  momentoContent: { flex: 1 },
  momentoTitle: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', marginBottom: 2 , fontWeight: '800' },
  momentoDesc: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', lineHeight: 1.4 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', width: 10 },
  bulletText: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', flex: 1, lineHeight: 1.4 },
  twoColLeft: { flex: 1, marginRight: 14 },
  twoColRight: { flex: 1 },
  colSubHeader: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', letterSpacing: 1, marginBottom: 6 },
  // --- Stili specifici Contratto (in stile IMD) ---
  contractTitle: { fontFamily: 'Heiti', fontSize: PDF_FS, letterSpacing: 1.5, textTransform: 'uppercase', color: '#000000', textAlign: 'center', marginBottom: 6 },
  contractParty: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', lineHeight: 1.5, marginBottom: 8 },
  contractBetween: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#6f4526', textAlign: 'center', marginVertical: 6, letterSpacing: 1 },
  clauseText: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', lineHeight: 1.5, marginBottom: 5 },
  signBlock: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  signCol: { width: '45%', alignItems: 'center' },
  signLabel: { fontFamily: 'Heiti', fontSize: PDF_FS, letterSpacing: 1, color: '#6f4526', marginBottom: 24 },
  signLine: { width: '100%', borderTopWidth: 0.5, borderTopColor: '#000000', paddingTop: 4 },
  signName: { fontFamily: 'Heiti', fontSize: PDF_FS, color: '#000000', textAlign: 'center' },
});

// Dati aziendali IMD (uniformi ai preventivi)
const IMD_INFO = {
  brand: 'The Italian Music Designer',
  short: 'IMD',
  referente: 'Giovanni Gargini',
  natoA: 'Firenze',
  dataNascita: '13/10/1986',
  cf: 'GRGGNN86R13D612V',
  residenza: 'Firenze, Via Faentina 102',
  tel: '+39 333 828 3982',
  email: 'giovannigargini@gmail.com',
  pec: 'giovannigargini@pec.it',
  iban: 'IT21W0347501605CC0011861850',
  ibanIntestatario: 'Giovanni Gargini',
  sito: 'www.italianmusicdesigner.com',
};

function QuotePDF({ quote, prezzoLordo, scontoperTe, logoPng, band, acconto, fd }) {
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const inclusi = ['Performance musicale come da programma'];
  if (fd.usaCoordinator) inclusi.push('Consulenza, direzione e coordinamento artistico');
  if (Number(fd.distanzaKm) > 0) inclusi.push(`Spese di trasferta`);
  if (fd.usaPernottamento) inclusi.push(`Pernottamento (${fd.numNotti} nott${Number(fd.numNotti) > 1 ? 'i' : 'e'} \u00d7 ${fd.numMusicisti} musicisti)`);
  if (Number(fd.numImpianti) > 0) inclusi.push(`Impianto/i audio professionale/i`);
  if (Number(fd.costoDj) > 0) inclusi.push('DJ Set');
  if (fd.usaBraniRichiesta) inclusi.push('Arrangiamento e studio di brani su richiesta');

  const esclusioni = [
    "Diritti d'Autore (S.I.A.E.) \u2013 a carico del Cliente (entro il giorno precedente l'evento)",
    `Vitto \u2013 pasto a sedere per n. ${fd.numPasti || ''} collaboratori`,
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {logoPng ? <Image style={pdfStyles.logo} src={logoPng} /> : null}
        <Text style={pdfStyles.docMeta}>Data di Emissione: {today}   |   Scadenza Offerta: {expiry}</Text>

        {/* 1. Dettagli Evento */}
        <Text style={pdfStyles.sectionHeader}>1. Dettagli dell&apos;Evento</Text>
        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoItem}>
            <Text style={pdfStyles.fieldLabel}>Cliente / Agenzia</Text>
            <Text style={pdfStyles.fieldValue}>{quote.client}</Text>
          </View>
          <View style={pdfStyles.infoItem}>
            <Text style={pdfStyles.fieldLabel}>Tipologia Evento</Text>
            <Text style={pdfStyles.fieldValue}>{quote.type}</Text>
          </View>
          <View style={pdfStyles.infoItem}>
            <Text style={pdfStyles.fieldLabel}>Data Evento</Text>
            <Text style={pdfStyles.fieldValue}>{quote.date}</Text>
          </View>
          {fd.nomeLocation ? (
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Nome Location</Text>
              <Text style={pdfStyles.fieldValue}>{fd.nomeLocation}</Text>
            </View>
          ) : null}
          <View style={pdfStyles.infoItem}>
            <Text style={pdfStyles.fieldLabel}>Location</Text>
            <Text style={pdfStyles.fieldValue}>{quote.location}</Text>
          </View>
          {fd.numeroOspiti ? (
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Numero Stimato Ospiti</Text>
              <Text style={pdfStyles.fieldValue}>{String(fd.numeroOspiti)} pax</Text>
            </View>
          ) : null}
          {getOrarioComplessivo(fd.momenti) ? (
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Orario Indicativo Evento</Text>
              <Text style={pdfStyles.fieldValue}>{getOrarioComplessivo(fd.momenti)}</Text>
            </View>
          ) : null}
        </View>

        {/* 2. Proposta Artistica */}
        <View>
          <Text style={pdfStyles.sectionHeader}>2. Proposta Artistica</Text>
          {(fd.momenti || []).filter(m => m.titolo).length > 0
            ? (fd.momenti || []).filter(m => m.titolo).map((m, i) => (
                <View key={i} style={pdfStyles.momentoRow} wrap={false}>
                  <Text style={pdfStyles.momentoBullet}>•</Text>
                  <View style={pdfStyles.momentoContent}>
                    <Text style={pdfStyles.momentoTitle}>
                      {m.titolo}{(m.inizio || m.fine) ? `  \u2014  Orario: ${[m.inizio, m.fine].filter(Boolean).join(' \u2013 ')}` : ''}
                    </Text>
                    {m.descrizione ? <Text style={pdfStyles.momentoDesc}>{m.descrizione}</Text> : null}
                  </View>
                </View>
              ))
            : <View style={pdfStyles.momentoRow}><Text style={pdfStyles.momentoDesc}>Nessun momento specificato</Text></View>
          }
        </View>

        {/* 3. Condizioni Economiche */}
        <View>
          <Text style={pdfStyles.sectionHeader}>3. Condizioni Economiche</Text>
          <View style={pdfStyles.ecoBox} wrap={false}>
            <View style={pdfStyles.ecoRow}>
              <Text style={pdfStyles.ecoLabel}>Prezzo Lordo</Text>
              <Text style={pdfStyles.ecoValue}>€ {prezzoLordo.toLocaleString('it-IT')} + IVA 22%</Text>
            </View>
            <View style={pdfStyles.ecoDivider} />
            <View style={pdfStyles.ecoRow}>
              <Text style={pdfStyles.ecoLabelStrong}>Sconto per Te</Text>
              <Text style={pdfStyles.ecoValue}>€ {scontoperTe.toLocaleString('it-IT')} + IVA 22%</Text>
            </View>
            {acconto > 0 ? (
              <>
                <View style={pdfStyles.ecoDivider} />
                <View style={pdfStyles.ecoSubRow}>
                  <Text style={pdfStyles.ecoSubLabel}>Acconto (caparra confirmatoria)</Text>
                  <Text style={pdfStyles.ecoSubValue}>€ {acconto.toLocaleString('it-IT')}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Inclusi / Esclusi */}
          <View style={{ marginTop: 14, flexDirection: 'row' }}>
            <View style={pdfStyles.twoColLeft}>
              <Text style={pdfStyles.colSubHeader}>INCLUSO NEL PREZZO</Text>
              {inclusi.map((item, i) => (
                <View key={i} style={pdfStyles.bulletRow}>
                  <Text style={pdfStyles.bulletDot}>•</Text>
                  <Text style={pdfStyles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={pdfStyles.twoColRight}>
              <Text style={pdfStyles.colSubHeader}>ESCLUSO DAL PREZZO</Text>
              {esclusioni.map((item, i) => (
                <View key={i} style={pdfStyles.bulletRow}>
                  <Text style={pdfStyles.bulletDot}>•</Text>
                  <Text style={pdfStyles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 4. Rider */}
        <View>
          <Text style={pdfStyles.sectionHeader}>4. Rider Tecnico &amp; Logistica</Text>
          {[
            `Attrezzatura audio: ${Number(fd.numImpianti) > 0 ? 'Fornita dalla band' : 'A cura del cliente/service'}`,
            'Alimentazione elettrica idonea nei punti di esibizione',
            "Camerino o area riservata per cambi, deposito strumenti e beni personali dei musicisti",
            "Ombra o copertura per il sole (tenda/ombrellone) per artisti e strumenti in caso di esibizione all'aperto",
            "Accesso alla location almeno 1 ora prima per montaggio e soundcheck",
            `Vitto: pasto caldo per n. ${fd.numPasti || ''} collaboratori`,
          ].map((item, i) => (
            <View key={i} style={pdfStyles.bulletRow}>
              <Text style={pdfStyles.bulletDot}>•</Text>
              <Text style={pdfStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 5. Web */}
        <View>
          <Text style={pdfStyles.sectionHeader}>5. Materiale Multimediale</Text>
          {['Sito Web: www.italianmusicdesigner.com', 'Video: youtube.com/@ItalianMusicDesigner'].map((item, i) => (
            <View key={i} style={pdfStyles.bulletRow}>
              <Text style={pdfStyles.bulletDot}>•</Text>
              <Text style={pdfStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 6. Contatti */}
        <View wrap={false}>
          <Text style={pdfStyles.sectionHeader}>6. Contatti</Text>
          <View style={pdfStyles.infoGrid}>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Referente Artistico</Text>
              <Text style={pdfStyles.fieldValue}>Giovanni Gargini</Text>
            </View>
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Telefono</Text>
              <Text style={pdfStyles.fieldValue}>+39 333 828 3982</Text>
            </View>
            <View style={pdfStyles.infoItemFull}>
              <Text style={pdfStyles.fieldLabel}>E-mail</Text>
              <Text style={pdfStyles.fieldValue}>giovannigargini@gmail.com</Text>
            </View>
          </View>
        </View>

        <Text style={pdfStyles.note}>
          Il presente preventivo ha validità 30 giorni dalla data di emissione.
        </Text>
        <View style={pdfStyles.footer}>
          <View style={pdfStyles.footerLine} />
          <Text style={pdfStyles.footerBrand}>The Italian Music Designer</Text>
        </View>
      </Page>
    </Document>
  );
}

// ==========================================
// DOCUMENTO PDF CONTRATTO (in stile IMD)
// ==========================================
function ContractPDF({ data, logoPng }) {
  const c = data;
  const compenso = Number(c.compensoTotale || 0);
  const acconto = Number(c.importoAcconto || 0);
  const saldo = Math.max(0, compenso - acconto);
  const momenti = (c.momenti || []).filter(m => m.titolo || m.inizio);
  
  // Inclusioni / esclusioni opzionali (gestite dai checkbox)
  const includAudio = c.includAudio === true;
  const escludiAudio = c.escludiAudio === true;
  const includLuci = c.includLuci === true;
  const escludiLuci = c.escludiLuci === true;
  const includViaggio = c.includViaggio === true;
  const escludiViaggio = c.escludiViaggio === true;
  const includAlloggio = c.includAlloggio === true;
  const escludiAlloggio = c.escludiAlloggio === true;
  const includVitto = c.includVitto === true;
  const escludiVitto = c.escludiVitto === true;

  // Genera liste dinamiche solo per gli elementi esplicitamente spuntati
  const inclusioniBuild = [];
  if (includAudio) inclusioniBuild.push("impianto audio");
  if (includLuci) inclusioniBuild.push("impianto luci");
  if (includViaggio) inclusioniBuild.push("rimborsi di viaggio e trasferta");
  if (includAlloggio) inclusioniBuild.push("alloggio");
  if (includVitto) inclusioniBuild.push("vitto e pasti per i musicisti");

  const esclusioniBuild = [];
  if (escludiAudio) esclusioniBuild.push("impianto audio (fornito da service esterno a carico del Cliente)");
  if (escludiLuci) esclusioniBuild.push("impianto luci (fornito da service esterno a carico del Cliente)");
  if (escludiViaggio) esclusioniBuild.push("rimborsi di viaggio e trasferta");
  if (escludiAlloggio) esclusioniBuild.push("costi di alloggio");
  if (escludiVitto) esclusioniBuild.push("vitto e pasti per i musicisti");
  
  // Aggiungi esclusioni personalizzate se presenti
  if (c.esclusoAltro) esclusioniBuild.push(c.esclusoAltro);
  
  const inclusioni = inclusioniBuild.join(", ");
  const esclusioni = esclusioniBuild.join(", ");

  const hasClientInfo = [c.nomeCliente, c.indirizzoCliente, c.cfCliente, c.pivaCliente, c.pecSdiCliente].some(Boolean);
  const eventContext = [
    c.nomeLocation ? `presso ${c.nomeLocation}` : '',
    c.indirizzoLocation ? `situata in ${c.indirizzoLocation}` : '',
    c.dataEvento ? `il giorno ${c.dataEvento}` : ''
  ].filter(Boolean);
  const paymentText = [
    c.giorniAcconto ? `entro ${c.giorniAcconto} giorni lavorativi dalla sottoscrizione` : '',
    c.tempisticaSaldo ? `entro ${c.tempisticaSaldo}` : ''
  ].filter(Boolean);
  const isCausaleDataAvailable = Boolean(c.dataEvento || c.nomeCliente);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {logoPng ? <Image style={pdfStyles.logo} src={logoPng} /> : null}
        <Text style={pdfStyles.contractTitle}>Scrittura Privata per Prestazione Artistica</Text>

        {/* Parti */}
        <Text style={pdfStyles.contractBetween}>TRA LE PARTI</Text>
        <Text style={pdfStyles.contractParty}>
          <Text style={{ fontWeight: 'bold' }}>{IMD_INFO.brand} ({IMD_INFO.short})</Text>, nella persona del referente artistico {IMD_INFO.referente}, nato a {IMD_INFO.natoA} il {IMD_INFO.dataNascita}, Codice Fiscale {IMD_INFO.cf}, residente in {IMD_INFO.residenza}, tel. {IMD_INFO.tel}, e-mail {IMD_INFO.email} (di seguito «IMD»);
        </Text>
        <Text style={pdfStyles.contractBetween}>E</Text>
        {hasClientInfo ? (
          <Text style={pdfStyles.contractParty}>
            <Text style={{ fontWeight: 'bold' }}>{c.nomeCliente || ''}</Text>
            {c.indirizzoCliente ? `, residente / con sede legale in ${c.indirizzoCliente}` : ''}
            {c.cfCliente ? `, Codice Fiscale ${c.cfCliente}` : ''}
            {c.pivaCliente ? ` / P.IVA ${c.pivaCliente}` : ''}
            {c.pecSdiCliente ? `, PEC/SDI ${c.pecSdiCliente}` : ''}
            {` (di seguito «il Cliente»).`}
          </Text>
        ) : null}

        {/* Premesse */}
        <Text style={pdfStyles.sectionHeader}>PREMESSO CHE</Text>
        {eventContext.length ? (
          <Text style={pdfStyles.clauseText}>
            • Il Cliente intende avvalersi delle prestazioni musicali di IMD per un evento che si terrà {eventContext.join(', ')}.
          </Text>
        ) : null}
        <Text style={pdfStyles.clauseText}>
          • IMD dichiara di essere libera da impegni e disponibile a prestare la propria opera artistica.
        </Text>
        <Text style={pdfStyles.clauseText}>Tutto ciò premesso, le parti convengono e stipulano quanto segue:</Text>

        {/* 1. Oggetto */}
        <Text style={pdfStyles.sectionHeader}>1. OGGETTO</Text>
        <Text style={pdfStyles.clauseText}>1.1 IMD si impegna a svolgere la propria esibizione musicale nell&apos;evento sopra indicato.</Text>
        {(c.durataOre || c.oraInizio || c.oraFine) ? (
          <Text style={pdfStyles.clauseText}>
            1.2 La prestazione avrà una durata complessiva di {c.durataOre || 'da definire'} ore{c.oraInizio || c.oraFine ? `, dalle ${c.oraInizio || '—'} alle ${c.oraFine || '—'}` : ''}, secondo il seguente programma di massima:
          </Text>
        ) : null}
        {c.orarioMontaggio ? (
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>{c.orarioMontaggio} — Montaggio e sound check</Text></View>
        ) : null}
        {momenti.map((m, i) => (
          <View key={i} style={pdfStyles.bulletRow}>
            <Text style={pdfStyles.bulletDot}>•</Text>
            <Text style={pdfStyles.bulletText}>
              {[m.inizio, m.fine].filter(Boolean).join(' – ')}{m.titolo ? ` — Live "${m.titolo}"` : ''}{c.minutiPausa ? ` con pause di max ${c.minutiPausa} minuti` : ''}
            </Text>
          </View>
        ))}
        {c.oraFine ? (
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>{c.oraFine} — Termine della prestazione</Text></View>
        ) : null}

        {/* 2. Prestazioni */}
        <Text style={pdfStyles.sectionHeader}>2. PRESTAZIONI DI IMD</Text>
        <Text style={pdfStyles.clauseText}>2.1 Il vitto (pasto caldo o buffet a seconda degli accordi) per i musicisti {escludiVitto ? 'è a carico del Cliente.' : includVitto ? 'è incluso nel prezzo.' : 'è da concordare.'}</Text>
        <Text style={pdfStyles.clauseText}>2.2 IMD può sostituire i musicisti titolari in caso di impedimento, ad eccezione del frontman {c.nomeFrontman || IMD_INFO.referente}.</Text>
        <Text style={pdfStyles.clauseText}>2.3 IMD può interrompere o non svolgere l&apos;esibizione qualora condizioni meteorologiche avverse o logistiche mettano a rischio l&apos;incolumità dei musicisti, gli strumenti o le apparecchiature elettriche. In caso di esibizione all&apos;aperto dovrà essere garantita una postazione coperta e protetta da pioggia e sole diretto.</Text>
        <Text style={pdfStyles.clauseText}>2.4 Il repertorio musicale sarà scelto autonomamente da IMD; il Cliente potrà proporre brani preferenziali appartenenti al repertorio.</Text>
        {(c.strumentiFormazione || c.numeroMusicisti) ? (
          <Text style={pdfStyles.clauseText}>
            2.5 La formazione per l&apos;evento sarà composta da {c.strumentiFormazione || 'strumenti da concordare'}{c.numeroMusicisti ? ` (${c.numeroMusicisti} musicisti)` : ''}.
          </Text>
        ) : null}
        <Text style={pdfStyles.clauseText}>
          2.6 {
            escludiAudio && escludiLuci
              ? 'L’attrezzatura audio e luci saranno fornite da un service esterno a carico del Cliente.'
              : escludiAudio
                ? 'L’attrezzatura audio sarà fornita da un service esterno a carico del Cliente; le luci saranno invece fornite da IMD.'
                : escludiLuci
                  ? 'IMD fornirà a proprie spese l’attrezzatura audio; le luci saranno fornite da un service esterno a carico del Cliente.'
                  : includAudio && includLuci
                    ? 'IMD fornirà a proprie spese l’attrezzatura audio e luci necessarie.'
                    : includAudio
                      ? 'IMD fornirà a proprie spese l’attrezzatura audio.'
                      : includLuci
                        ? 'IMD fornirà a proprie spese l’attrezzatura luci.'
                        : 'L’attrezzatura audio e le luci saranno da concordare tra le parti.'
          }
        </Text>

        {/* 3. Luogo e variazioni */}
        <Text style={pdfStyles.sectionHeader}>3. LUOGO DELL&apos;ADEMPIMENTO E VARIAZIONI</Text>
        <Text style={pdfStyles.clauseText}>3.1 Eventuali prolungamenti di orario o servizi aggiuntivi rispetto a quanto pattuito comporteranno supplementi di prezzo, comunicati da IMD e pagati dal Cliente.</Text>
        <Text style={pdfStyles.clauseText}>3.2 Le parti restano vincolate esclusivamente alle prestazioni, ai luoghi, alle date e agli orari indicati nel presente contratto.</Text>
        <Text style={pdfStyles.clauseText}>3.3 IMD si impegna a raggiungere la location in tempo utile per il montaggio e il sound check.</Text>

        {/* 4. Corrispettivo */}
        <Text style={pdfStyles.sectionHeader}>4. CORRISPETTIVO E SPESE</Text>
        <Text style={pdfStyles.clauseText}>4.1 Il compenso totale a carico del Cliente è di € {compenso.toLocaleString('it-IT')} + IVA, così suddiviso:</Text>
        {(acconto || c.giorniAcconto) ? (
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>{acconto ? `Acconto (caparra confirmatoria/penitenziale): € ${acconto.toLocaleString('it-IT')} + IVA alla firma del contratto` : 'Acconto:'}{c.giorniAcconto ? `, e comunque entro ${c.giorniAcconto} giorni lavorativi dalla sottoscrizione.` : '.'}</Text></View>
        ) : null}
        {(saldo || c.tempisticaSaldo) ? (
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Saldo: € {saldo.toLocaleString('it-IT')} + IVA da corrispondersi{c.tempisticaSaldo ? ` entro ${c.tempisticaSaldo}` : ''}.</Text></View>
        ) : null}
        {isCausaleDataAvailable || c.causaleBonifico ? (
          <Text style={pdfStyles.clauseText}>4.2 Il pagamento dovrà essere effettuato tramite bonifico bancario su IBAN {IMD_INFO.iban} intestato a {IMD_INFO.ibanIntestatario}. Causale: «{c.causaleBonifico || `Consulenza musicale evento ${c.dataEvento || ''}${c.dataEvento && c.nomeCliente ? ' - ' : ''}${c.nomeCliente || ''}`}».</Text>
        ) : null}
        {(inclusioni || esclusioni) ? (
          <Text style={pdfStyles.clauseText}>
            4.3 {inclusioni ? `Sono inclusi nel prezzo: ${inclusioni}.` : ''}{esclusioni ? ` Sono esclusi dal prezzo: ${esclusioni}.` : ''}
          </Text>
        ) : null}

        {/* 5. SIAE */}
        <Text style={pdfStyles.sectionHeader}>5. DIRITTI S.I.A.E.</Text>
        <Text style={pdfStyles.clauseText}>5.1 I diritti d&apos;autore (SIAE) e i relativi costi di licenza sono totalmente a carico del Cliente, che dovrà provvedere al pagamento e all&apos;ottenimento del permesso entro il giorno precedente l&apos;evento, esibendo la ricevuta a IMD prima dell&apos;inizio dell&apos;esibizione.</Text>

        {/* 6. Recesso, Annullamento e Forza Maggiore */}
        <Text style={pdfStyles.sectionHeader}>6. RECESSO, ANNULLAMENTO E FORZA MAGGIORE</Text>
        <Text style={pdfStyles.clauseText}>6.1 <Text style={{fontWeight: 'bold'}}>Modalità di annullamento da parte del Cliente</Text>: L&apos;eventuale annullamento dell&apos;ingaggio da parte del Cliente dovrà essere comunicato per iscritto mediante raccomandata A/R oppure PEC all&apos;indirizzo {IMD_INFO.pec}. L&apos;annullamento avrà effetto dalla data di ricezione della comunicazione da parte del Gruppo.
Qualora il Cliente comunichi il recesso entro 7 (sette) giorni dalla sottoscrizione del contratto e prima del versamento della caparra confirmatoria, il Gruppo sarà liberato da ogni obbligo relativo all&apos;esecuzione del servizio.</Text>

        <Text style={pdfStyles.clauseText}>6.2 <Text style={{fontWeight: 'bold'}}>Penali di annullamento da parte del Cliente</Text>: Qualora l&apos;annullamento avvenga oltre i 7 giorni dalla firma o dopo il versamento della caparra, si applicheranno le seguenti penali in base al preavviso fornito dal Cliente rispetto alla data dell&apos;evento:</Text>
        
        <View style={{marginBottom: 12, marginLeft: 10}}>
          <View style={{flexDirection: 'row', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 3}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, fontWeight: 'bold', color: '#000000'}}>Preavviso di annullamento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, fontWeight: 'bold', color: '#000000', textAlign: 'center'}}>Compenso totale dovuto al Gruppo</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, fontWeight: 'bold', color: '#000000'}}>Note sul trattamento della Caparra Confirmatoria</Text>
          </View>
          <View style={{flexDirection: 'row', marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1'}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}><Text style={{fontWeight: 'bold'}}>Oltre 90 giorni</Text> prima dell&apos;evento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, color: '#000000', textAlign: 'center'}}>Solo trattenuta della caparra confirmatoria</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}>Il Gruppo trattiene la caparra ai sensi dell&apos;art. 1385 C.C., senza ulteriori somme dovute.</Text>
          </View>
          <View style={{flexDirection: 'row', marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1'}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}><Text style={{fontWeight: 'bold'}}>Da 90 a 61 giorni</Text> prima dell&apos;evento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, color: '#000000', textAlign: 'center'}}><Text style={{fontWeight: 'bold'}}>30%</Text> del compenso totale pattuito</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}>La caparra già versata sarà imputata a tale importo; il Cliente corrisponde solo l&apos;eventuale differenza.</Text>
          </View>
          <View style={{flexDirection: 'row', marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1'}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}><Text style={{fontWeight: 'bold'}}>Da 60 a 31 giorni</Text> prima dell&apos;evento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, color: '#000000', textAlign: 'center'}}><Text style={{fontWeight: 'bold'}}>50%</Text> del compenso totale pattuito</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}>La caparra già versata sarà imputata a tale importo; il Cliente corrisponde solo l&apos;eventuale differenza.</Text>
          </View>
          <View style={{flexDirection: 'row', marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#d6d3d1'}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}><Text style={{fontWeight: 'bold'}}>Da 30 a 16 giorni</Text> prima dell&apos;evento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, color: '#000000', textAlign: 'center'}}><Text style={{fontWeight: 'bold'}}>75%</Text> del compenso totale pattuito</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}>La caparra già versata sarà imputata a tale importo; il Cliente corrisponde solo l&apos;eventuale differenza.</Text>
          </View>
          <View style={{flexDirection: 'row', paddingBottom: 3}}>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}><Text style={{fontWeight: 'bold'}}>Entro 15 giorni</Text> prima dell&apos;evento</Text>
            <Text style={{flex: 0.8, fontSize: PDF_FS, color: '#000000', textAlign: 'center'}}><Text style={{fontWeight: 'bold'}}>100%</Text> del compenso totale pattuito</Text>
            <Text style={{flex: 1.2, fontSize: PDF_FS, color: '#000000'}}>La caparra già versata sarà imputata a tale importo; il Cliente corrisponde solo l&apos;eventuale differenza.</Text>
          </View>
        </View>

        <Text style={pdfStyles.clauseText}>6.3 <Text style={{fontWeight: 'bold'}}>Annullamento da parte del Gruppo</Text>: Qualora l&apos;annullamento dell&apos;evento sia imputabile al Gruppo e non derivi da una causa di forza maggiore, il Gruppo si impegna, ove possibile, a proporre al Cliente un sostituto qualificato e di adeguato livello professionale, senza costi aggiuntivi per il Cliente.</Text>
        <View style={{marginLeft: 20, marginBottom: 6}}>
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Qualora il Cliente accetti il sostituto proposto, il servizio sarà regolarmente eseguito e il contratto resterà valido alle condizioni originariamente pattuite.</Text></View>
          <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Qualora il Cliente rifiuti il sostituto proposto, oppure qualora il Gruppo non sia in grado di individuare un sostituto idoneo, il Gruppo restituirà al Cliente il doppio della caparra confirmatoria versata, ai sensi dell&apos;art. 1385 del Codice Civile.</Text></View>
        </View>

        <Text style={pdfStyles.clauseText}>6.5 <Text style={{fontWeight: 'bold'}}>Caso fortuito e forza maggiore</Text>: Il Gruppo non sarà responsabile per la mancata, parziale o ritardata esecuzione del servizio qualora ciò sia determinato da eventi imprevedibili, inevitabili e non imputabili al Gruppo, tali da rendere impossibile o impedire sostanzialmente l&apos;esecuzione del servizio.
A titolo esemplificativo e non esaustivo, rientrano tra tali eventi: calamità naturali, terremoti, alluvioni, incendi, condizioni meteorologiche eccezionali, provvedimenti delle autorità, guerre, sommosse, epidemie o pandemie, scioperi non direttamente imputabili al Gruppo, gravi malattie o infortuni certificati degli artisti o del personale incaricato, nonché incidenti stradali documentati verificatisi durante il tragitto verso il luogo dell&apos;evento.
In tali circostanze il Gruppo si impegna, ove ragionevolmente possibile, a individuare un sostituto o una soluzione alternativa idonea allo svolgimento del servizio.
Qualora l&apos;esecuzione del servizio divenga definitivamente impossibile per causa di forza maggiore, le Parti concorderanno in buona fede le modalità di gestione delle somme eventualmente già versate, tenendo conto delle prestazioni eventualmente già eseguite e dei costi non recuperabili sostenuti dal Gruppo.</Text>

        <Text style={pdfStyles.clauseText}>6.6 <Text style={{fontWeight: 'bold'}}>Comunicazioni</Text>: Le comunicazioni relative all&apos;annullamento, al recesso o a eventuali impedimenti che possano compromettere l&apos;esecuzione del servizio dovranno essere effettuate tempestivamente e secondo le modalità previste dal presente articolo.</Text>

        {/* 7. Privacy */}
        <Text style={pdfStyles.sectionHeader}>7. PRIVACY E DIRITTI D&apos;IMMAGINE</Text>
        <Text style={pdfStyles.clauseText}>7.1 Il Cliente autorizza il trattamento dei propri dati personali ai fini dell&apos;esecuzione del presente contratto ai sensi del D.lgs. 196/2003 e del GDPR (Reg. UE 2016/679).</Text>
        <Text style={pdfStyles.clauseText}>7.2 Il Cliente autorizza la ripresa foto/video e l&apos;eventuale pubblicazione delle immagini dell&apos;evento per uso divulgativo e promozionale di IMD (social media, sito web).</Text>
        <Text style={pdfStyles.clauseText}>7.3 L&apos;uso di tali immagini è vietato in contesti che possano ledere la dignità o il decoro delle parti.</Text>

        {/* 8. Richieste tecniche */}
        <Text style={pdfStyles.sectionHeader}>8. RICHIESTE TECNICHE E LOGISTICHE</Text>
        <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Allacciamento elettrico idoneo e sicuro in prossimità della postazione.</Text></View>
        <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Acqua e bicchieri per {c.numeroPasti || '—'} musicisti.</Text></View>
        <View style={pdfStyles.bulletRow}><Text style={pdfStyles.bulletDot}>•</Text><Text style={pdfStyles.bulletText}>Spazio adibito a camerino/spogliatoio per i musicisti.</Text></View>

        {/* Dichiarazioni finali e firme */}
        <View wrap={false}>
          <Text style={pdfStyles.sectionHeader}>DICHIARAZIONI FINALI</Text>
          <Text style={pdfStyles.clauseText}>Le parti dichiarano che i dati anagrafici e fiscali indicati nel presente contratto sono veritieri e si impegnano al rispetto di ogni clausola qui sottoscritta.</Text>
          {(c.luogoFirma || c.dataFirma) ? (
            <Text style={pdfStyles.clauseText}>Luogo: {c.luogoFirma || 'Firenze'}{c.dataFirma ? `, Data: ${c.dataFirma}` : ''}</Text>
          ) : null}

          <View style={pdfStyles.signBlock}>
            <View style={pdfStyles.signCol}>
              <Text style={pdfStyles.signLabel}>PER IMD</Text>
              <View style={pdfStyles.signLine}><Text style={pdfStyles.signName}>{IMD_INFO.referente}</Text></View>
            </View>
            {c.nomeCliente ? (
              <View style={pdfStyles.signCol}>
                <Text style={pdfStyles.signLabel}>IL CLIENTE</Text>
                <View style={pdfStyles.signLine}><Text style={pdfStyles.signName}>{c.nomeCliente}</Text></View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <View style={pdfStyles.footerLine} />
          <Text style={pdfStyles.footerBrand}>The Italian Music Designer</Text>
        </View>
      </Page>
    </Document>
  );
}

// ==========================================
// COMPONENTE STAMPA / PDF
// ==========================================
function PrintView({ quote, onBack }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoPng, setLogoPng] = useState('');
  const fd = quote.formData || {};
  const band = fd.band || '';
  const acconto = Number(fd.acconto || 0);

  // Prezzi mostrati dall'app (nessun ricalcolo nel PDF)
  const prezzoLordo = roundPrice(quote.prezzoLordo ?? (quote.total / 0.6));
  const scontoperTe = roundPrice(quote.scontoPerTe ?? (prezzoLordo * Number(fd.sconto || 0.65)));

  useEffect(() => {
    let active = true;
    svgToPngDataUrl(logoIMD).then(png => { if (active) setLogoPng(png); });
    return () => { active = false; };
  }, []);

  // Unica fonte di verità: il documento PDF react-pdf
  const pdfDoc = (
    <QuotePDF
      quote={quote}
      prezzoLordo={prezzoLordo}
      scontoperTe={scontoperTe}
      logoPng={logoPng}
      band={band}
      acconto={acconto}
      fd={fd}
    />
  );

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Preventivo_${quote.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore generazione PDF:', err);
      alert('Errore nella generazione del PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8 flex flex-col items-center animate-in fade-in">

      {/* Bottoni di controllo */}
      <div className="max-w-4xl w-full flex justify-end gap-3 mb-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-lg transition-colors font-medium shadow-sm">
          <ArrowLeft size={18} /> Chiudi
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-70"
        >
          <Printer size={18} /> {isGenerating ? 'Generazione...' : 'Scarica PDF'}
        </button>
      </div>

      {/* Anteprima live del PDF (stessa fonte del file scaricato) */}
      <PDFViewer className="max-w-4xl w-full h-[80vh] rounded-xl shadow-xl border border-stone-200" showToolbar={false}>
        {pdfDoc}
      </PDFViewer>
    </div>
  );
}

// ==========================================
// COMPONENTE LOGIN (Magic Link)
// ==========================================
function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logoIMD} alt="IMD Logo" className="h-24 w-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Preventivi Eventi</h1>
          <p className="text-slate-500 text-sm mt-1">Accedi per continuare</p>
        </div>

        {sent ? (
          <div className="text-center bg-green-50 border border-green-200 rounded-xl p-6">
            <Mail size={32} className="text-green-600 mx-auto mb-3" />
            <p className="text-slate-800 font-medium">Controlla la tua email!</p>
            <p className="text-slate-500 text-sm mt-1">
              Ti abbiamo inviato un link di accesso a <strong>{email}</strong>. Cliccalo per entrare.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuamail@esempio.com"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium shadow-sm transition-colors disabled:opacity-70"
            >
              <Mail size={18} />
              {loading ? 'Invio in corso...' : 'Invia link di accesso'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE CONTRATTO (precompilato dal preventivo)
// ==========================================
const ContractField = ({ label, name, value, onChange, opts = {} }) => {
  const commonProps = {
    name,
    value: value ?? '',
    onChange,
    placeholder: opts.placeholder || '',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500'
  };

  if (opts.multiline) {
    return (
      <div className={opts.full ? 'md:col-span-2' : ''}>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <textarea
          {...commonProps}
          rows={opts.rows || 3}
          className={`${commonProps.className} resize-y min-h-[96px]`}
        />
      </div>
    );
  }

  return (
    <div className={opts.full ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        {...commonProps}
        type={opts.type || 'text'}
      />
    </div>
  );
};

const ContractSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
      <Icon size={16} className="text-slate-500" />
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
    </div>
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

function ContractForm({ quote, onBack, onSave }) {
  const fd = quote.formData || {};
  const momenti = fd.momenti || [];
  const saved = fd.contractData || {};

  const oraInizio = momenti.find(m => m?.inizio)?.inizio || '';
  const oraFine = [...momenti].reverse().find(m => m?.fine)?.fine || '';

  const [data, setData] = useState({
    // Cliente (dati fiscali da compilare)
    nomeCliente: quote.client || '',
    indirizzoCliente: '',
    cfCliente: '',
    pivaCliente: '',
    pecSdiCliente: '',
    // Location (precompilata)
    nomeLocation: fd.nomeLocation || '',
    indirizzoLocation: fd.address || quote.location || '',
    dataEvento: quote.date || '',
    // Orari (derivati dai momenti)
    oraInizio,
    oraFine,
    orarioMontaggio: subtractOneHour(oraInizio),
    durataOre: computeDurataOre(oraInizio, oraFine),
    minutiPausa: 20,
    // Formazione (precompilata dal preventivo)
    strumentiFormazione: '',
    numeroMusicisti: fd.numMusicisti || '',
    numeroImpianti: fd.numImpianti ?? 0,
    numeroPasti: fd.numPasti || '',
    nomeFrontman: '', // nome del frontman della band
    // Inclusioni / esclusioni opzionali: le esclusioni restano state espliciti dell'utente
    includAudio: Number(fd.numImpianti || 0) > 0,
    escludiAudio: false,
    includLuci: true,
    escludiLuci: false,
    includViaggio: Number(fd.distanzaKm || 0) > 0,
    escludiViaggio: false,
    includAlloggio: Boolean(fd.usaPernottamento),
    escludiAlloggio: false,
    includVitto: false,
    escludiVitto: false,
    esclusoAltro: '', // testo delle esclusioni personalizzate
    // Economico (default: prezzo lordo, aggiustabile col concordato)
    compensoTotale: quote.prezzoLordo ?? quote.total ?? '',
    importoAcconto: fd.acconto || 0,
    giorniAcconto: 5,
    tempisticaSaldo: "il giorno dell'evento",
    causaleBonifico: '',
    // Sovrascrivi con i dati del contratto gia' salvati (se presenti)
    ...saved,
  });

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  const importoSaldo = Math.max(0, Number(data.compensoTotale || 0) - Number(data.importoAcconto || 0));

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const logoPngRef = useRef('');

  const handleSaveContract = async () => {
    setSaving(true);
    setSavedOk(false);
    try {
      await onSave(quote.id, data);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      console.error('Errore salvataggio contratto:', err);
      alert('Errore nel salvataggio del contratto: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadContract = async () => {
    setPdfGenerating(true);
    try {
      if (!logoPngRef.current) logoPngRef.current = await svgToPngDataUrl(logoIMD);
      const contractData = {
        ...data,
        momenti,
        luogoFirma: 'Firenze',
        dataFirma: new Date().toLocaleDateString('it-IT'),
      };
      const doc = <ContractPDF data={contractData} logoPng={logoPngRef.current} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contratto_${quote.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore generazione contratto:', err);
      alert('Errore nella generazione del contratto: ' + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-purple-600" /> Contratto — {quote.client}
          </h2>
          <p className="text-slate-500 text-sm">Precompilato dal preventivo {quote.id}. Completa i dati mancanti.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveContract}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors font-medium shadow-sm disabled:opacity-70"
          >
            <Save size={18} /> {saving ? 'Salvataggio...' : savedOk ? 'Salvato ✓' : 'Salva'}
          </button>
          <button
            type="button"
            onClick={handleDownloadContract}
            disabled={pdfGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-70"
          >
            <FileText size={18} /> {pdfGenerating ? 'Generazione...' : 'Scarica Contratto PDF'}
          </button>
          <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors font-medium shadow-sm">
            <ArrowLeft size={18} /> Chiudi
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        <ContractSection title="Dati Cliente" icon={User}>
          <ContractField label="Nome / Ragione Sociale" name="nomeCliente" value={data.nomeCliente} onChange={handle} opts={{ full: true }} />
          <ContractField label="Indirizzo / Sede legale" name="indirizzoCliente" value={data.indirizzoCliente} onChange={handle} opts={{ full: true, placeholder: 'Via, civico, CAP, Città' }} />
          <ContractField label="Codice Fiscale" name="cfCliente" value={data.cfCliente} onChange={handle} />
          <ContractField label="P.IVA" name="pivaCliente" value={data.pivaCliente} onChange={handle} />
          <ContractField label="PEC / Codice SDI" name="pecSdiCliente" value={data.pecSdiCliente} onChange={handle} opts={{ full: true }} />
        </ContractSection>

        <ContractSection title="Evento e Location" icon={MapPin}>
          <ContractField label="Nome Location" name="nomeLocation" value={data.nomeLocation} onChange={handle} />
          <ContractField label="Data Evento" name="dataEvento" value={data.dataEvento} onChange={handle} />
          <ContractField label="Indirizzo Location" name="indirizzoLocation" value={data.indirizzoLocation} onChange={handle} opts={{ full: true }} />
        </ContractSection>

        <ContractSection title="Orari e Programma" icon={Clock}>
          <ContractField label="Ora Inizio" name="oraInizio" value={data.oraInizio} onChange={handle} />
          <ContractField label="Ora Fine" name="oraFine" value={data.oraFine} onChange={handle} />
          <ContractField label="Durata (ore)" name="durataOre" value={data.durataOre} onChange={handle} />
          <ContractField label="Orario Montaggio" name="orarioMontaggio" value={data.orarioMontaggio} onChange={handle} />
          <ContractField label="Minuti Pausa (max)" name="minutiPausa" value={data.minutiPausa} onChange={handle} opts={{ type: 'number' }} />
          <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Programma live (dai momenti)</p>
            {momenti.filter(m => m.titolo || m.inizio).length > 0 ? (
              <ul className="text-sm text-slate-700 space-y-1">
                {momenti.filter(m => m.titolo || m.inizio).map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{[m.inizio, m.fine].filter(Boolean).join(' – ')}</span>
                    {m.titolo ? ` — ${m.titolo}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Nessun momento con orario nel preventivo.</p>
            )}
          </div>
        </ContractSection>

        <ContractSection title="Formazione" icon={Music}>
          <ContractField label="Strumenti Formazione" name="strumentiFormazione" value={data.strumentiFormazione} onChange={handle} opts={{ full: true, placeholder: 'es. tromba, voce, contrabbasso...' }} />
          <ContractField label="Numero Musicisti" name="numeroMusicisti" value={data.numeroMusicisti} onChange={handle} opts={{ type: 'number' }} />
          <ContractField label="Nome Frontman" name="nomeFrontman" value={data.nomeFrontman} onChange={handle} opts={{ full: false, placeholder: 'Nome del frontman della band' }} />
          <ContractField label="Numero Impianti Audio" name="numeroImpianti" value={data.numeroImpianti} onChange={handle} opts={{ type: 'number' }} />
          <ContractField label="Numero Pasti" name="numeroPasti" value={data.numeroPasti} onChange={handle} opts={{ type: 'number' }} />
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-4">Inclusioni ed Esclusioni nel Prezzo</p>
            
            {/* Inclusioni */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">✓ Incluso nel Prezzo</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="includAudio" checked={data.includAudio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-green-600" />
                  <span className="text-sm text-slate-700">Impianto Audio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="includLuci" checked={data.includLuci} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-green-600" />
                  <span className="text-sm text-slate-700">Impianto Luci</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="includViaggio" checked={data.includViaggio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-green-600" />
                  <span className="text-sm text-slate-700">Rimborso Trasferta/Viaggio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="includAlloggio" checked={data.includAlloggio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-green-600" />
                  <span className="text-sm text-slate-700">Alloggio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="includVitto" checked={data.includVitto} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-green-600" />
                  <span className="text-sm text-slate-700">Vitto (Pasti)</span>
                </label>
              </div>
            </div>

            {/* Esclusioni */}
            <div className="pt-4 border-t border-blue-300">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">✗ Escluso dal Prezzo</p>
              <div className="space-y-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escludiAudio" checked={data.escludiAudio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-red-600" />
                  <span className="text-sm text-slate-700">Impianto Audio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escludiLuci" checked={data.escludiLuci} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-red-600" />
                  <span className="text-sm text-slate-700">Impianto Luci</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escludiViaggio" checked={data.escludiViaggio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-red-600" />
                  <span className="text-sm text-slate-700">Rimborso Trasferta/Viaggio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escludiAlloggio" checked={data.escludiAlloggio} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-red-600" />
                  <span className="text-sm text-slate-700">Alloggio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escludiVitto" checked={data.escludiVitto} onChange={handle} className="w-4 h-4 rounded border-slate-300 text-red-600" />
                  <span className="text-sm text-slate-700">Vitto (Pasti)</span>
                </label>
              </div>
              {!data.escludiAudio && !data.escludiLuci && !data.escludiViaggio && !data.escludiAlloggio && !data.escludiVitto && data.esclusoAltro === '' && (
                <p className="italic text-slate-400 text-sm">Nessuna esclusione aggiunta</p>
              )}
              <label className="block text-xs font-medium text-slate-600 mb-2">Esclusioni Personalizzate (Altro):</label>
              <textarea
                name="esclusoAltro"
                value={data.esclusoAltro}
                onChange={handle}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="es. taxi boat, rimborsi specifici, ecc."
              />
            </div>
          </div>
        </ContractSection>

        <ContractSection title="Corrispettivo e Spese" icon={Calculator}>
          <ContractField label="Compenso Totale (€)" name="compensoTotale" value={data.compensoTotale} onChange={handle} opts={{ type: 'number' }} />
          <ContractField label="Acconto (€)" name="importoAcconto" value={data.importoAcconto} onChange={handle} opts={{ type: 'number' }} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo (€)</label>
            <input type="text" value={importoSaldo.toLocaleString('it-IT')} readOnly className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600" />
          </div>
          <ContractField label="Giorni per Acconto" name="giorniAcconto" value={data.giorniAcconto} onChange={handle} opts={{ type: 'number' }} />
          <ContractField label="Tempistica Saldo" name="tempisticaSaldo" value={data.tempisticaSaldo} onChange={handle} opts={{ full: true }} />
          <ContractField label="Causale Bonifico" name="causaleBonifico" value={data.causaleBonifico} onChange={handle} opts={{ full: true, multiline: true, rows: 3, placeholder: 'es. Consulenza musicale evento [data] - [cliente]' }} />
        </ContractSection>

        <p className="text-xs text-slate-500">
          Luogo di firma: <strong>Firenze</strong>. Data di firma: data di generazione del PDF.
        </p>
        <p className="text-xs text-slate-500">
          Il prezzo di default è il <strong>prezzo lordo</strong> del preventivo: modificalo con l'importo concordato se diverso.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPALE (ROUTING)
// ==========================================
// Helpers localStorage per modalità DEV (nessuna sessione Supabase disponibile)
const DEV_KEY = 'imd_quotes_dev';
const devLoad = () => { try { return JSON.parse(localStorage.getItem(DEV_KEY) || '[]'); } catch { return []; } };
const devSave = (q) => localStorage.setItem(DEV_KEY, JSON.stringify(q));

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);

  // Gestione delle "Pagine": 'dashboard' | 'create' | 'print'
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedQuote, setSelectedQuote] = useState(null);

  // In locale bypassa l'auth; in produzione usa Supabase Magic Link
  useEffect(() => {
    if (import.meta.env.DEV) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Carica i preventivi da Supabase (mappa form_data -> formData)
  const fetchQuotes = useCallback(async () => {
    if (import.meta.env.DEV) {
      setQuotes(devLoad());
      return;
    }
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Errore caricamento preventivi:', error);
      return;
    }
    setQuotes(data.map(({ form_data, created_at, ...rest }) => ({
      ...rest,
      formData: form_data
    })));
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || session) fetchQuotes();
  }, [session, fetchQuotes]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setQuotes([]);
    setCurrentView('dashboard');
    setSelectedQuote(null);
  };

  const handleApprove = async (id) => {
    if (import.meta.env.DEV) {
      const updated = quotes.map(q => q.id === id ? { ...q, status: 'Approvato' } : q);
      setQuotes(updated); devSave(updated); return;
    }
    const { error } = await supabase.from('quotes').update({ status: 'Approvato' }).eq('id', id);
    if (error) {
      alert('Errore: ' + error.message);
      return;
    }
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'Approvato' } : q));
  };

  const handleArchive = async (id) => {
    if (import.meta.env.DEV) {
      const updated = quotes.map(q => q.id === id ? { ...q, status: 'Archiviato' } : q);
      setQuotes(updated); devSave(updated); return;
    }
    const { error } = await supabase.from('quotes').update({ status: 'Archiviato' }).eq('id', id);
    if (error) {
      alert('Errore: ' + error.message);
      return;
    }
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'Archiviato' } : q));
  };

  const handleDelete = async (id) => {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;

    const confirmed = window.confirm(`Eliminare definitivamente il preventivo di ${quote.client}? Questa azione non può essere annullata.`);
    if (!confirmed) return;

    if (import.meta.env.DEV) {
      const updated = quotes.filter(q => q.id !== id);
      setQuotes(updated); devSave(updated);
      setSelectedQuote(prev => prev && prev.id === id ? null : prev);
      return;
    }

    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) {
      alert('Errore: ' + error.message);
      return;
    }

    const updated = quotes.filter(q => q.id !== id);
    setQuotes(updated);
    setSelectedQuote(prev => prev && prev.id === id ? null : prev);
  };

  const handleEdit = (id) => {
    const quote = quotes.find(q => q.id === id);
    if (quote?.formData) {
      setSelectedQuote(quote);
      setCurrentView('edit');
    } else {
      alert('Dati del form non disponibili per questo preventivo.');
    }
  };

  const handleSaveNewQuote = async (newQuote) => {
    if (import.meta.env.DEV) {
      const updated = [...quotes, newQuote];
      setQuotes(updated); devSave(updated);
      setCurrentView('dashboard'); return;
    }
    const { formData, ...rest } = newQuote;
    const { error } = await supabase.from('quotes').insert({ ...rest, form_data: formData });
    if (error) {
      alert('Errore nel salvataggio: ' + error.message);
      return;
    }
    await fetchQuotes();
    setCurrentView('dashboard');
  };

  const handleUpdateQuote = async (updatedQuote) => {
    if (import.meta.env.DEV) {
      const updated = quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q);
      setQuotes(updated); devSave(updated);
      setSelectedQuote(null); setCurrentView('dashboard'); return;
    }
    const { formData, ...rest } = updatedQuote;
    const { error } = await supabase.from('quotes').update({ ...rest, form_data: formData }).eq('id', updatedQuote.id);
    if (error) {
      alert('Errore nell\'aggiornamento: ' + error.message);
      return;
    }
    await fetchQuotes();
    setSelectedQuote(null);
    setCurrentView('dashboard');
  };

  const handlePrint = (quote) => {
    setSelectedQuote(quote);
    setCurrentView('print');
  };

  const handleCreateContract = (quote) => {
    if (!quote.formData) {
      alert('Dati del preventivo non disponibili per questo contratto.');
      return;
    }
    setSelectedQuote(quote);
    setCurrentView('contract');
  };

  // Salva i dati del contratto dentro form_data.contractData del preventivo
  const handleSaveContract = async (quoteId, contractData) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    const mergedFormData = { ...(quote.formData || {}), contractData };
    if (import.meta.env.DEV) {
      const updated = quotes.map(q => q.id === quoteId ? { ...q, formData: mergedFormData } : q);
      setQuotes(updated); devSave(updated);
      setSelectedQuote(prev => prev && prev.id === quoteId ? { ...prev, formData: mergedFormData } : prev);
      return;
    }
    const { error } = await supabase.from('quotes').update({ form_data: mergedFormData }).eq('id', quoteId);
    if (error) throw error;
    setQuotes(quotes.map(q => q.id === quoteId ? { ...q, formData: mergedFormData } : q));
    setSelectedQuote(prev => prev && prev.id === quoteId ? { ...prev, formData: mergedFormData } : prev);
  };

  // Schermata di caricamento iniziale / login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        Caricamento...
      </div>
    );
  }
  if (!import.meta.env.DEV && !session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Barra utente + logout (solo in produzione) */}
        {!import.meta.env.DEV && session && (
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{session.user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <LogOut size={16} /> Esci
              </button>
            </div>
          </div>
        )}

        {currentView === 'dashboard' ? (
          <Dashboard 
            quotes={quotes}
            onApprove={handleApprove}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onCreateNew={() => setCurrentView('create')}
            onPrint={handlePrint}
            onCreateContract={handleCreateContract}
          />
        ) : currentView === 'print' && selectedQuote ? (
          <PrintView 
            quote={selectedQuote} 
            onBack={() => {
              setCurrentView('dashboard');
              setSelectedQuote(null);
            }} 
          />
        ) : currentView === 'contract' && selectedQuote?.formData ? (
          <ContractForm
            quote={selectedQuote}
            onSave={handleSaveContract}
            onBack={() => {
              setCurrentView('dashboard');
              setSelectedQuote(null);
            }}
          />
        ) : currentView === 'edit' && selectedQuote?.formData ? (
          <QuoteForm 
            onCancel={() => {
              setCurrentView('dashboard');
              setSelectedQuote(null);
            }}
            onSave={handleUpdateQuote}
            initialData={{ ...selectedQuote.formData, _editId: selectedQuote.id, _editStatus: selectedQuote.status }}
          />
        ) : (
          <QuoteForm 
            onCancel={() => setCurrentView('dashboard')}
            onSave={handleSaveNewQuote}
          />
        )}
      </div>
    </div>
  );
}