import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import logoIMD from './assets/logo-imd.svg';
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
  Users
} from 'lucide-react';

// ==========================================
// COMPONENTE DASHBOARD
// ==========================================
function Dashboard({ quotes, onApprove, onArchive, onEdit, onCreateNew, onPrint }) {
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
                <th className="px-6 py-4">Formazione</th>
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
                    <td className="px-6 py-4 text-slate-700">{quote.band}</td>
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
    numMomenti: 1,
    numPostazioni: 1,
    numMusicisti: 3,
    cachetMusicista: 200,
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
    percMaggAgenzia: 10,
    sconto: 0
  };
  const [formData, setFormData] = useState(initialData ? { ...defaults, ...initialData } : defaults);

  const [distanzaLoading, setDistanzaLoading] = useState(false);
  const [distanzaError, setDistanzaError] = useState('');
  const [prezzoAutoFetched, setPrezzoAutoFetched] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
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
    const costiMusicisti = formData.numMusicisti * formData.cachetMusicista;
    const costiImpianti = formData.numImpianti * formData.costoImpianto;
    const costoDj = Number(formData.costoDj);
    const costoBraniRichiesta = formData.usaBraniRichiesta ? Number(formData.costoBraniRichiesta) : 0;
    const costiCoordinator = formData.usaCoordinator ? formData.costoCoordinator : 0;

    // Trasferta
    const distanzaEffettiva = formData.andataRitorno ? formData.distanzaKm * 2 : formData.distanzaKm;
    const litriNecessari = formData.consumoMedio > 0 ? distanzaEffettiva / formData.consumoMedio : 0;
    const costoCarburante = Math.round(litriNecessari * formData.prezzoBenzina * formData.numMacchine);

    // Pedaggio autostradale (~0.08 €/km media autostrade italiane)
    const pedaggioStimato = formData.inclPedaggio
      ? (formData.pedaggioAutoCalc
          ? Math.round(distanzaEffettiva * 0.08 * formData.numMacchine)
          : formData.pedaggioManuale)
      : 0;

    const costoTrasferta = costoCarburante + pedaggioStimato;

    // Pernottamento
    const costoPernottamento = formData.usaPernottamento
      ? formData.numNotti * formData.prezzoPerNotte * formData.numMusicisti
      : 0;

    // Costo vivo ("uscite") - senza trasferta per calcolo commissioni
    const totaleCostiBase = costiMusicisti + costiImpianti + costoDj + costoBraniRichiesta + costiCoordinator;

    // Ricarichi/commissioni (sui costi base, non sulla trasferta)
    const commissioneWP = formData.usaCommWP ? totaleCostiBase * (formData.percCommWP / 100) : 0;
    const commissioneFTM = formData.usaCommFTM ? totaleCostiBase * (formData.percCommFTM / 100) : 0;
    const extraScontoVal = formData.usaExtraSconto ? totaleCostiBase * (formData.percExtraSconto / 100) : 0;
    const maggiorazioneAgenziaVal = formData.usaMaggAgenzia ? totaleCostiBase * (formData.percMaggAgenzia / 100) : 0;
    const subTotale = totaleCostiBase + commissioneWP + commissioneFTM + maggiorazioneAgenziaVal - extraScontoVal + costoTrasferta + costoPernottamento;

    // Totale finale al cliente
    const totaleFinale = subTotale - formData.sconto;

    // Margine Agenzia stimato
    const margineAgenzia = totaleFinale - totaleCostiBase - costoTrasferta - costoPernottamento;

    return {
      costiMusicisti,
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
      commissioneWP,
      commissioneFTM,
      extraScontoVal,
      maggiorazioneAgenziaVal,
      totaleFinale,
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
      band: `${getFormazioneName(formData.numMusicisti)}${formData.band ? ' — ' + formData.band : ''}`,
      total: calc.totaleFinale,
      status: formData._editStatus || 'In attesa',
      formData: { ...formData }
    };
    onSave(newQuote);
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
          <form id="quote-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-8">
            
            {/* SEZIONE 1: Dettagli Generali */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <User size={18} className="text-blue-500"/> Dettagli Generali
              </h3>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Via, nr civico, CAP, Città</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="es. Via Roma 1, 53100 Siena" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Numero Momenti</label>
                  <input type="number" name="numMomenti" min="1" value={formData.numMomenti} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Numero Postazioni</label>
                  <input type="number" name="numPostazioni" min="1" value={formData.numPostazioni} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* SEZIONE 2: Servizio Musicale & Staffing */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <Music size={18} className="text-blue-500"/> Servizio Musicale & Staffing
              </h3>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dettagli Formazione (opzionale — per PDF)</label>
                  <input type="text" name="band" value={formData.band} onChange={handleChange} placeholder="es. Contrabbasso, Batteria, Piano + DJ" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  <p className="text-xs text-slate-500 mt-1">Formazione: <span className="font-medium text-slate-700">{getFormazioneName(formData.numMusicisti)}</span> (calcolata automaticamente)</p>
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

            {/* SEZIONE 4: Trasferta */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <Car size={18} className="text-blue-500"/> Trasferta
              </h3>

              {/* Distanza automatica */}
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

              {/* Pedaggio autostradale */}
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

              {/* Pernottamento */}
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

              {/* Riepilogo trasferta inline */}
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

            {/* SEZIONE 5: Commissioni e Sconti */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <Calculator size={18} className="text-blue-500"/> Commissioni e Sconti
              </h3>
              <div className="space-y-4">
                {/* Commissione Wedding Planner */}
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

                {/* Commissione Fix The Music */}
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

                {/* Extra Sconto */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="usaExtraSconto" checked={formData.usaExtraSconto} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Extra Sconto</span>
                    </label>
                    {formData.usaExtraSconto && (
                      <div className="flex items-center gap-2">
                        <input type="number" name="percExtraSconto" min="0" max="100" value={formData.percExtraSconto} onChange={handleChange} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Maggiorazione Agenzia */}
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

              {calc.commissioneWP > 0 && (
                <div className="flex justify-between items-center text-yellow-400 pt-2">
                  <span>Comm. Wedding Planner ({formData.percCommWP}%)</span>
                  <span>+ € {calc.commissioneWP.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
                </div>
              )}
              {calc.commissioneFTM > 0 && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Comm. Fix The Music ({formData.percCommFTM}%)</span>
                  <span>+ € {calc.commissioneFTM.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
                </div>
              )}
              {calc.extraScontoVal > 0 && (
                <div className="flex justify-between items-center text-red-400">
                  <span>Extra Sconto ({formData.percExtraSconto}%)</span>
                  <span>- € {calc.extraScontoVal.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
                </div>
              )}
              {calc.maggiorazioneAgenziaVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Maggiorazione Agenzia ({formData.percMaggAgenzia}%)</span>
                  <span>+ € {calc.maggiorazioneAgenziaVal.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
                </div>
              )}
              {formData.sconto > 0 && (
                <div className="flex justify-between items-center text-red-400">
                  <span>Sconto Applicato</span>
                  <span>- € {formData.sconto.toLocaleString('it-IT')}</span>
                </div>
              )}
            </div>

            {/* TOTALI FINALI */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-4">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1"> Prezzo netto</p>
                <div className="text-3xl font-bold text-white">
                  € {calc.totaleFinale.toLocaleString('it-IT', {maximumFractionDigits: 0})}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Prezzo Fatturato</p>
                <div className="text-2xl font-bold text-indigo-300">
                  € {Math.round(calc.totaleFinale / 0.6).toLocaleString('it-IT')}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Sconto per Te</p>
                <div className="text-2xl font-bold text-emerald-300">
                  € {Math.round((calc.totaleFinale / 0.6) * 0.8).toLocaleString('it-IT')}
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
// COMPONENTE STAMPA / PDF
// ==========================================
function PrintView({ quote, onBack }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const fd = quote.formData || {};

  // Calcolo prezzi finali
  const prezzoFatturato = Math.round(quote.total / 0.6);
  const scontoperTe = Math.round(prezzoFatturato * 0.8);

  // Costruisci lista servizi dinamica dal formData
  const servizi = [];

  servizi.push({
    titolo: `Formazione musicale — ${quote.band}`,
    desc: `${fd.numMusicisti || 3} musicisti professionisti per intrattenimento musicale dal vivo`
  });

  if (fd.numMomenti > 1) {
    servizi.push({
      titolo: `${fd.numMomenti} momenti musicali`,
      desc: 'Set musicali suddivisi in base alla scaletta dell\'evento'
    });
  }

  if (fd.numPostazioni > 1) {
    servizi.push({
      titolo: `${fd.numPostazioni} postazioni`,
      desc: 'Setup audio e strumentazione in più punti della location'
    });
  }

  servizi.push({
    titolo: `Impianto audio professionale${fd.numImpianti > 1 ? ` (×${fd.numImpianti})` : ''}`,
    desc: 'Amplificazione, mixer, casse e microfonazione completa'
  });

  if (Number(fd.costoDj) > 0) {
    servizi.push({
      titolo: 'DJ Set',
      desc: 'Servizio DJ con consolle e playlist personalizzata'
    });
  }

  if (fd.usaBraniRichiesta) {
    servizi.push({
      titolo: 'Brani su richiesta',
      desc: 'Studio e preparazione di brani specifici richiesti dal cliente'
    });
  }

  if (fd.usaCoordinator) {
    servizi.push({
      titolo: 'Event Coordinator',
      desc: 'Coordinamento e gestione della parte musicale durante l\'evento'
    });
  }

  if (fd.distanzaKm > 0) {
    servizi.push({
      titolo: 'Trasferta inclusa',
      desc: `Spostamento da Firenze a ${fd.address || quote.location} (${fd.distanzaKm} km)`
    });
  }

  if (fd.usaPernottamento) {
    servizi.push({
      titolo: `Pernottamento${fd.numNotti > 1 ? ` (${fd.numNotti} notti)` : ''}`,
      desc: 'Alloggio per i musicisti incluso nel pacchetto'
    });
  }

  // Converti SVG logo in PNG data URL per html2canvas
  const svgToPngDataUrl = (svgUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
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

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      // Converti il logo SVG in PNG nel clone per html2canvas
      const element = document.getElementById('preventivo-container');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: async (clonedDoc) => {
          const logoEl = clonedDoc.querySelector('#preventivo-container img');
          if (logoEl) {
            const pngDataUrl = await svgToPngDataUrl(logoEl.src);
            if (pngDataUrl) logoEl.src = pngDataUrl;
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - margin * 2) {
        const scale = (pageHeight - margin * 2) / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const xOffset = (pageWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      }

      pdf.save(`Preventivo_${quote.id}.pdf`);
    } catch (err) {
      console.error('Errore generazione PDF:', err);
      alert('Errore nella generazione del PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8 flex flex-col items-center animate-in fade-in">
      
      {/* Bottoni di controllo esterni al PDF */}
      <div className="max-w-3xl w-full flex justify-end gap-3 mb-4">
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

      <div id="preventivo-container" className="max-w-3xl w-full bg-white shadow-xl p-10 md:p-16" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        
        {/* Header con logo e info a sinistra */}
        <div className="mb-8">
          <img src={logoIMD} alt="The Italian Music Designer" className="h-48 w-auto mb-6" />
          <div className="space-y-1 font-sans text-sm">
            <p className="text-stone-800"><span className="text-stone-400">Preventivo - </span> The IMD</p>
            <p className="text-stone-800"><span className="text-stone-400">Location:</span> {quote.location}</p>
            <p className="text-stone-800"><span className="text-stone-400">Evento:</span> {quote.type}</p>
            <p className="text-stone-800"><span className="text-stone-400">Data:</span> {quote.date}</p>
          </div>
        </div>


        {/* Proposta Artistica */}
        <div className="mb-12">
          <h3 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-sans mb-6">Proposta Artistica</h3>
          <div className="space-y-4">
            {servizi.map((s, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0"></span>
                <div>
                  <p className="text-stone-800 font-medium" style={{ fontFamily: "'Georgia', serif" }}>{s.titolo}</p>
                  <p className="text-stone-400 text-sm font-sans mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-stone-200 mb-10"></div>

        {/* Riepilogo Economico */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-sans mb-6">Riepilogo economico</h3>
          
          <div className="bg-stone-50 p-8 space-y-5">
            {/* Prezzo finale IVA inclusa */}
            <div className="flex justify-between items-baseline">
              <span className="text-stone-600 font-sans text-sm">Totale (IVA inclusa)</span>
              <span className="text-2xl font-light text-stone-800">€ {prezzoFatturato.toLocaleString('it-IT')}</span>
            </div>

            <div className="w-full h-px bg-stone-200"></div>

            {/* Sconto per te */}
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-stone-800 font-sans text-sm font-medium">Prezzo riservato a te</span>
              </div>
              <span className="text-3xl font-light text-stone-900">€ {scontoperTe.toLocaleString('it-IT')}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-14 pt-8 border-t border-stone-100">
          <p className="text-xs text-stone-400 font-sans leading-relaxed text-center">
            Il presente preventivo ha validità 30 giorni dalla data di emissione.<br />
          </p>
        </div>

        {/* Footer brand */}
        <div className="mt-10 text-center">
          <div className="w-8 h-px bg-stone-300 mx-auto mb-4"></div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-300 font-sans">The Italian Music Designer</p>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPALE (ROUTING)
// ==========================================
export default function App() {
  // Carica preventivi da localStorage (persistenza tra refresh)
  const [quotes, setQuotes] = useState(() => {
    try {
      const saved = localStorage.getItem('imd-quotes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  // Salva su localStorage ogni volta che quotes cambia
  useEffect(() => {
    localStorage.setItem('imd-quotes', JSON.stringify(quotes));
  }, [quotes]);

  // Gestione delle "Pagine": 'dashboard' | 'create' | 'print'
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedQuote, setSelectedQuote] = useState(null);

  const handleApprove = (id) => {
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'Approvato' } : q));
  };

  const handleArchive = (id) => {
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

  const handleSaveNewQuote = (newQuote) => {
    setQuotes([...quotes, newQuote]);
    setCurrentView('dashboard');
  };

  const handleUpdateQuote = (updatedQuote) => {
    setQuotes(quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    setSelectedQuote(null);
    setCurrentView('dashboard');
  };

  const handlePrint = (quote) => {
    setSelectedQuote(quote);
    setCurrentView('print');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {currentView === 'dashboard' ? (
          <Dashboard 
            quotes={quotes}
            onApprove={handleApprove}
            onArchive={handleArchive}
            onEdit={handleEdit}
            onCreateNew={() => setCurrentView('create')}
            onPrint={handlePrint}
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