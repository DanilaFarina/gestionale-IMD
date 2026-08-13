import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Mail
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
// Disabilita la sillabazione automatica (spezza male le parole accentate)
Font.registerHyphenationCallback(word => [word]);

function roundPrice(value, step = PRICE_ROUNDING_STEP) {
  const amount = Number(value) || 0;
  if (amount === 0) return 0;

  const lower = Math.floor(amount / step) * step;
  const upper = lower + step;

  return amount - lower < upper - amount ? lower : upper;
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
function Dashboard({ quotes, onApprove, onArchive, onEdit, onCreateNew, onPrint, onDownloadInternalReport }) {
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approvato': return 'bg-green-100 text-green-800 border-green-200';
      case 'In attesa': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Archiviato': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Dettagli Evento</th>
                <th className="px-6 py-4">Totale (Escl. IVA)</th>
                <th className="px-6 py-4">Stato</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className={`transition-colors ${getRowHighlight(quote.status)}`}>
                    <td className="px-6 py-4 font-mono text-slate-500">{quote.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{quote.client}</div>
                      <div className="flex items-center text-slate-500 text-xs mt-1 gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {quote.date}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {quote.location} ({quote.type})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">€{quote.total.toLocaleString('it-IT')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(quote.status)}`}>
                        {quote.status === 'Approvato' && <CheckCircle size={14} className="mr-1.5" />}
                        {quote.status === 'In attesa' && <Clock size={14} className="mr-1.5" />}
                        {quote.status === 'Archiviato' && <XCircle size={14} className="mr-1.5" />}
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {quote.status === 'Approvato' && (
                          <button 
                            onClick={() => onPrint(quote)}
                            title="Genera PDF Preventivo"
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <Printer size={18} />
                          </button>
                        )}
                        {quote.formData && (
                          <button
                            onClick={() => onDownloadInternalReport(quote)}
                            title="Scarica Report Interno"
                            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Calculator size={18} />
                          </button>
                        )}
                        {quote.status === 'In attesa' && (
                          <button 
                            onClick={() => onApprove(quote.id)}
                            title="Segna come Approvato"
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => onEdit(quote.id)}
                          title="Modifica Preventivo"
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        {quote.status !== 'Archiviato' && (
                          <button 
                            onClick={() => onArchive(quote.id)}
                            title="Archivia / Cestina"
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-100 p-4 rounded-full mb-3 text-slate-400">
                        <Briefcase size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Nessun preventivo</h3>
                      <p className="text-slate-500 mt-1 max-w-sm">La tua tabella è vuota. Inizia a creare un nuovo preventivo per tracciare i tuoi eventi e incassi.</p>
                      <button 
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

function QuoteForm({ onCancel, onSave, initialData }) {
  // Stato del form
  const defaults = {
    client: '',
    date: '',
    address: '',
    type: 'Matrimonio',
    band: '',
    acconto: 0,
    numeroOspiti: '',
    orarioEvento: '',
    numPasti: 3,
    repertorio: '',
    numMomenti: 1,
    momenti: [{ titolo: '', descrizione: '', orario: '' }],
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
    costoCoordinator: 100,
    // Trasferta
    distanzaKm: 0,
    prezzoBenzina: 1.75,
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
  const [prezzoAutoFetched, setPrezzoAutoFetched] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  const handleMomentiCount = (delta) => {
    setFormData(prev => {
      const n = Math.max(1, prev.numMomenti + delta);
      const momenti = [...(prev.momenti || [])];
      while (momenti.length < n) momenti.push({ titolo: '', descrizione: '', orario: '' });
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
    const timer = setTimeout(() => {
      if (formData.address) {
        calcolaDistanza(formData.address);
      } else {
        setFormData(prev => ({ ...prev, distanzaKm: 0 }));
        setDistanzaError('');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData.address, calcolaDistanza]);

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
    const costoCarburante = Math.round(litriNecessari * n(formData.prezzoBenzina) * n(formData.numMacchine));

    // Pedaggio autostradale (~0.08 €/km media autostrade italiane)
    const pedaggioStimato = formData.inclPedaggio
      ? (formData.pedaggioAutoCalc
          ? Math.round(distanzaEffettiva * 0.08 * n(formData.numMacchine))
          : n(formData.pedaggioManuale))
      : 0;

    const costoTrasferta = costoCarburante + pedaggioStimato;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.client) return alert("Inserisci almeno il nome del cliente!");

    const newQuote = {
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
    };
    onSave(newQuote);
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
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-6">

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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Band / Formazione</label>
                    <input type="text" name="band" value={formData.band} onChange={handleChange} placeholder="es. Talking Ties Trio" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    <p className="text-xs text-slate-500 mt-1">Appare nel PDF come nome del gruppo</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Evento</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Via, nr civico, CAP, Città</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="es. Via Roma 1, 53100 Siena" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Orario Evento</label>
                    <input type="text" name="orarioEvento" value={formData.orarioEvento} onChange={handleChange} placeholder="es. 18:00 – 01:00" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Numero Pasti</label>
                    <input type="number" name="numPasti" min="0" value={formData.numPasti} onChange={handleChange} placeholder="es. 3" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    <p className="text-xs text-slate-500 mt-1">Pasti per gli artisti (Vitto nelle condizioni PDF)</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Repertorio Musicale</label>
                    <input type="text" name="repertorio" value={formData.repertorio} onChange={handleChange} placeholder="es. Swing italiano, jazz, New Orleans, ragtime" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
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
                              <label className="text-xs text-slate-500">Orario:</label>
                              <input
                                type="text"
                                value={m.orario || ''}
                                onChange={e => handleMomentoField(i, 'orario', e.target.value)}
                                placeholder="es. 17:00"
                                className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
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

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
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
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" name="andataRitorno" checked={formData.andataRitorno} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-medium text-blue-700">Andata e Ritorno</span>
                    </label>
                    <p className="text-xs text-blue-500 mt-2">Distanza calcolata automaticamente via OpenStreetMap. Puoi sovrascriverla sotto.</p>
                  </div>

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
const pdfStyles = StyleSheet.create({
  page: { paddingHorizontal: 55, paddingVertical: 55, fontFamily: 'PT Serif', color: '#292524', fontSize: 11 },
  logo: { width: 200, height: 133, alignSelf: 'center', marginBottom: 24, objectFit: 'contain' },
  infoBlock: { marginBottom: 40 },
  infoLine: { fontFamily: 'Roboto', fontSize: 10, marginBottom: 3, color: '#292524' },
  infoLabel: { color: '#a8a29e' },
  sectionTitle: { fontFamily: 'Roboto', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#a8a29e', marginBottom: 18 },
  serviceRow: { flexDirection: 'row', marginBottom: 12 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#a8a29e', marginTop: 6, marginRight: 10 },
  serviceTitle: { fontFamily: 'PT Serif', fontSize: 12, color: '#292524' },
  serviceDesc: { fontFamily: 'Roboto', fontSize: 9, color: '#a8a29e', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e7e5e4', marginVertical: 32 },
  ecoBox: { backgroundColor: '#fafaf9', padding: 28 },
  ecoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ecoLabel: { fontFamily: 'Roboto', fontSize: 10, color: '#57534e' },
  ecoLabelStrong: { fontFamily: 'Roboto', fontSize: 10, color: '#292524', fontWeight: 'bold' },
  ecoValue: { fontSize: 20, color: '#292524' },
  ecoValueBig: { fontSize: 26, color: '#1c1917' },
  ecoDivider: { height: 1, backgroundColor: '#e7e5e4', marginVertical: 18 },
  note: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#f5f5f4', fontFamily: 'Roboto', fontSize: 8, color: '#a8a29e', textAlign: 'center', lineHeight: 1.5 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerLine: { width: 32, height: 1, backgroundColor: '#d6d3d1', marginBottom: 12 },
  footerBrand: { fontFamily: 'Roboto', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: '#d6d3d1' },
  ecoSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  ecoSubLabel: { fontFamily: 'Roboto', fontSize: 9, color: '#78716c' },
  ecoSubValue: { fontFamily: 'Roboto', fontSize: 13, color: '#292524' },
  docMeta: { fontFamily: 'Roboto', fontSize: 8, color: '#a8a29e', textAlign: 'center', marginBottom: 24 },
  sectionHeader: { fontFamily: 'Roboto', fontSize: 7.5, letterSpacing: 1.5, color: '#292524', marginBottom: 10, marginTop: 20, borderBottomWidth: 0.5, borderBottomColor: '#e7e5e4', paddingBottom: 4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 6, paddingRight: 8 },
  infoItemFull: { width: '100%', marginBottom: 6 },
  fieldLabel: { fontFamily: 'Roboto', fontSize: 7.5, color: '#a8a29e', marginBottom: 1 },
  fieldValue: { fontFamily: 'Roboto', fontSize: 10, color: '#292524' },
  momentoBlock: { marginBottom: 12, paddingLeft: 10, borderLeftWidth: 1.5, borderLeftColor: '#e7e5e4' },
  momentoTitle: { fontFamily: 'Roboto', fontSize: 10, color: '#292524', marginBottom: 2 },
  momentoDesc: { fontFamily: 'Roboto', fontSize: 9, color: '#a8a29e', lineHeight: 1.4 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { fontFamily: 'Roboto', fontSize: 9, color: '#a8a29e', width: 10 },
  bulletText: { fontFamily: 'Roboto', fontSize: 9, color: '#57534e', flex: 1, lineHeight: 1.4 },
  twoColLeft: { flex: 1, marginRight: 14 },
  twoColRight: { flex: 1 },
  colSubHeader: { fontFamily: 'Roboto', fontSize: 7.5, color: '#a8a29e', letterSpacing: 1, marginBottom: 6 },
});

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
          {fd.orarioEvento ? (
            <View style={pdfStyles.infoItem}>
              <Text style={pdfStyles.fieldLabel}>Orario Indicativo Evento</Text>
              <Text style={pdfStyles.fieldValue}>{fd.orarioEvento}</Text>
            </View>
          ) : null}
        </View>

        {/* 2. Proposta Artistica */}
        <Text style={pdfStyles.sectionHeader}>2. Proposta Artistica</Text>
        {(fd.momenti || []).filter(m => m.titolo).length > 0
          ? (fd.momenti || []).filter(m => m.titolo).map((m, i) => (
              <View key={i} style={pdfStyles.momentoBlock}>
                <Text style={pdfStyles.momentoTitle}>
                  {m.titolo}{m.orario ? `  \u2014  Orario: ${m.orario}` : ''}
                </Text>
                {m.descrizione ? <Text style={pdfStyles.momentoDesc}>{m.descrizione}</Text> : null}
              </View>
            ))
          : <View style={pdfStyles.momentoBlock}><Text style={pdfStyles.momentoDesc}>Nessun momento specificato</Text></View>
        }

        {/* 3. Condizioni Economiche */}
        <Text style={pdfStyles.sectionHeader}>3. Condizioni Economiche</Text>
        <View style={pdfStyles.ecoBox}>
          <View style={pdfStyles.ecoRow}>
            <Text style={pdfStyles.ecoLabel}>Prezzo Lordo</Text>
            <Text style={pdfStyles.ecoValue}>€ {prezzoLordo.toLocaleString('it-IT')} + IVA 22%</Text>
          </View>
          <View style={pdfStyles.ecoDivider} />
          <View style={pdfStyles.ecoRow}>
            <Text style={pdfStyles.ecoLabelStrong}>Sconto per Te</Text>
            <Text style={pdfStyles.ecoValueBig}>€ {scontoperTe.toLocaleString('it-IT')} + IVA 22%</Text>
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

        {/* 4. Rider */}
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

        {/* 5. Web */}
        <Text style={pdfStyles.sectionHeader}>5. Materiale Multimediale</Text>
        {['Sito Web: www.italianmusicdesigner.com', 'Video: youtube.com/@ItalianMusicDesigner'].map((item, i) => (
          <View key={i} style={pdfStyles.bulletRow}>
            <Text style={pdfStyles.bulletDot}>•</Text>
            <Text style={pdfStyles.bulletText}>{item}</Text>
          </View>
        ))}

        {/* 6. Contatti */}
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

  // Converti SVG logo in PNG data URL (una sola volta)
  const svgToPngDataUrl = (svgUrl) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Usa le proporzioni reali del logo (1774x1183)
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
  };

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
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-lg transition-colors font-medium shadow-sm">
          <ArrowLeft size={18} /> Chiudi
        </button>
        <button
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

  const handleDownloadInternalReport = (quote) => {
    const fd = quote.formData;
    if (!fd) {
      alert('Dati del form non disponibili per questo preventivo.');
      return;
    }

    const costiMusicisti = Number(fd.numMusicisti || 0) * Number(fd.cachetMusicista || 0);
    const costoCerimonia = Number(fd.costoCerimonia || 0);
    const costoExtra = Number(fd.costoExtra || 0);
    const costiImpianti = Number(fd.numImpianti || 0) * Number(fd.costoImpianto || 0);
    const costoDj = Number(fd.costoDj || 0);
    const costoBraniRichiesta = fd.usaBraniRichiesta ? Number(fd.costoBraniRichiesta || 0) : 0;
    const costiCoordinator = fd.usaCoordinator ? Number(fd.costoCoordinator || 0) : 0;

    const distanzaEffettiva = fd.andataRitorno ? Number(fd.distanzaKm || 0) * 2 : Number(fd.distanzaKm || 0);
    const litriNecessari = Number(fd.consumoMedio || 0) > 0 ? distanzaEffettiva / Number(fd.consumoMedio) : 0;
    const costoCarburante = Math.round(litriNecessari * Number(fd.prezzoBenzina || 0) * Number(fd.numMacchine || 0));
    const pedaggioStimato = fd.inclPedaggio
      ? (fd.pedaggioAutoCalc
          ? Math.round(distanzaEffettiva * 0.08 * Number(fd.numMacchine || 0))
          : Number(fd.pedaggioManuale || 0))
      : 0;
    const costoTrasferta = costoCarburante + pedaggioStimato;
    const costoPernottamento = fd.usaPernottamento
      ? Number(fd.numNotti || 0) * Number(fd.prezzoPerNotte || 0) * Number(fd.numMusicisti || 0)
      : 0;

    const totaleCostiBase = costiMusicisti + costoCerimonia + costoExtra + costiImpianti + costoDj + costoBraniRichiesta + costiCoordinator;
    const prezzoServiziMaggiorato = fd.usaMaggAgenzia
      ? totaleCostiBase / (1 - Number(fd.percMaggAgenzia || 0) / 100)
      : totaleCostiBase;
    const maggiorazioneAgenziaVal = prezzoServiziMaggiorato - totaleCostiBase;
    let prezzoFinaleRaw = prezzoServiziMaggiorato + costoTrasferta + costoPernottamento;
    const preFTM = prezzoFinaleRaw;
    if (fd.usaCommFTM) prezzoFinaleRaw = prezzoFinaleRaw / (1 - Number(fd.percCommFTM || 0) / 100);
    const commissioneFTMVal = prezzoFinaleRaw - preFTM;
    const preWP = prezzoFinaleRaw;
    if (fd.usaCommWP) prezzoFinaleRaw = prezzoFinaleRaw / (1 - Number(fd.percCommWP || 0) / 100);
    const commissioneWPVal = prezzoFinaleRaw - preWP;
    const prezzoFinale = roundPrice(prezzoFinaleRaw);
    const prezzoLordo = roundPrice(prezzoFinale / 0.6);
    const scontoPerTe = roundPrice(prezzoLordo * Number(fd.sconto || 0.65));
    const margineAgenzia = prezzoFinale - totaleCostiBase - costoTrasferta - costoPernottamento;

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

    addTitle('REPORT INTERNO PREVENTIVO');
    addLine('ID Report', quote.id || '-');
    addLine('Generato il', new Date().toLocaleString('it-IT'));

    y += 2;
    addSection('Dettagli Generali');
    addLine('Cliente / Sposi', fd.client || quote.client || '-');
    addLine('Tipo Evento', fd.type || quote.type || '-');
    addLine('Data Evento', fd.date || quote.date || '-');
    addLine('Indirizzo', fd.address || quote.location || '-');
    addLine('Numero Momenti', fd.numMomenti);
    if (fd.momenti?.length) {
      fd.momenti.forEach((m, i) => {
        addLine(`  Momento ${i + 1}`, m.titolo || '-');
        if (m.descrizione) addLine('', m.descrizione);
      });
    }
    y += 2;
    addSection('Servizio Musicale e Staffing');
    addLine('Numero Musicisti', fd.numMusicisti);
    addLine('Numero Musicisti', fd.numMusicisti);
    addLine('Costo Cerimonia', euro(fd.costoCerimonia));
    addLine('Costo Extra', euro(fd.costoExtra));
    addLine('Numero Impianti Audio', fd.numImpianti);
    addLine('Costo DJ', euro(fd.costoDj));
    addLine('Brani su Richiesta', fd.usaBraniRichiesta ? `SI (${euro(fd.costoBraniRichiesta)})` : 'NO');
    addLine('Event Coordinator', fd.usaCoordinator ? `SI (${euro(fd.costoCoordinator)})` : 'NO');

    y += 2;
    addSection('Trasferta e Pernottamento');
    addLine('Distanza', `${fd.distanzaKm || 0} km`);
    addLine('Andata/Ritorno', fd.andataRitorno ? 'SI' : 'NO');
    addLine('Numero Macchine', fd.numMacchine);
    addLine('Prezzo Benzina', `${euro(fd.prezzoBenzina)} / L`);
    addLine('Consumo Medio', `${fd.consumoMedio || 0} km/L`);
    addLine('Pedaggio', fd.inclPedaggio ? (fd.pedaggioAutoCalc ? `Stimato (${euro(pedaggioStimato)})` : `Manuale (${euro(fd.pedaggioManuale)})`) : 'Non incluso');
    addLine('Costo Carburante', euro(costoCarburante));
    addLine('Costo Trasferta Totale', euro(costoTrasferta));
    addLine('Pernottamento', fd.usaPernottamento ? `SI (${fd.numNotti} notti x ${euro(fd.prezzoPerNotte)})` : 'NO');
    addLine('Costo Pernottamento Totale', euro(costoPernottamento));

    y += 2;
    addSection('Commissioni e Sconti');
    addLine('Maggiorazione Agenzia', fd.usaMaggAgenzia ? `${fd.percMaggAgenzia}% (+${euro(Math.round(maggiorazioneAgenziaVal))})` : 'NO');
    addLine('Commissione Wedding Planner', fd.usaCommWP ? `${fd.percCommWP}% (+${euro(Math.round(commissioneWPVal))})` : 'NO');
    addLine('Commissione Fix The Music', fd.usaCommFTM ? `${fd.percCommFTM}% (+${euro(Math.round(commissioneFTMVal))})` : 'NO');

    y += 2;
    addSection('Riepilogo Economico');
    addLine('Totale Costi Base', euro(totaleCostiBase));
    addLine('① Prezzo Finale Cliente', `${euro(Math.round(prezzoFinale))} + IVA 22%`);
    addLine('② Prezzo Lordo (÷0.6)', `${euro(Math.round(prezzoLordo))} + IVA 22%`);
    addLine(`③ Sconto per Te (×${formatMultiplier(fd.sconto || 0.65)})`, `${euro(scontoPerTe)} + IVA 22%`);
    addLine('Margine Agenzia Stimato', euro(Math.round(margineAgenzia)));

    pdf.save(`Report_Interno_${quote.id || 'PREVENTIVO'}.pdf`);
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
            onEdit={handleEdit}
            onCreateNew={() => setCurrentView('create')}
            onPrint={handlePrint}
            onDownloadInternalReport={handleDownloadInternalReport}
          />
        ) : currentView === 'print' && selectedQuote ? (
          <PrintView 
            quote={selectedQuote} 
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