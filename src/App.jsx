import React, { useState, useMemo } from 'react';
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
  Printer
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Preventivi Eventi</h1>
          <p className="text-slate-500 mt-1">Gestisci le tue richieste, calcola i cachet e chiudi le date.</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Preventivi Attivi</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{quotes.filter(q => q.status !== 'Archiviato').length}</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Music size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">In Attesa di Risposta</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalPending}</p>
          </div>
          <div className="h-12 w-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Approvati (Entrati)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalApproved}</p>
          </div>
          <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
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
function QuoteForm({ onCancel, onSave }) {
  // Stato del form
  const [formData, setFormData] = useState({
    client: '',
    date: '',
    location: '',
    type: 'Matrimonio',
    band: 'Trio',
    numMusicisti: 3,
    cachetMusicista: 200, // Costo base medio per musicista come da audio
    numImpianti: 1,
    costoImpianto: 50,    // 50€ fissi ad impianto come da audio
    usaCoordinator: true,
    costoCoordinator: 100, // Costo base coordinator
    speseViaggio: 0,      // Da calcolare es. via Michelin
    percCommissione: 0,   // Es. 10% wedding planner o 18% fix the music
    percMaggiorazione: 0, // Aggiunta per location lusso, ecc.
    sconto: 0             // Sconto al cliente
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  // Calcoli in tempo reale (Il "Riepilogo Interno" / Excel)
  const calc = useMemo(() => {
    const costiMusicisti = formData.numMusicisti * formData.cachetMusicista;
    const costiImpianti = formData.numImpianti * formData.costoImpianto;
    const costiCoordinator = formData.usaCoordinator ? formData.costoCoordinator : 0;
    const speseViaggio = Number(formData.speseViaggio);
    
    // Costo vivo ("uscite")
    const totaleCostiBase = costiMusicisti + costiImpianti + costiCoordinator + speseViaggio;

    // Aggiungiamo i ricarichi/commissioni
    const commissioneVal = totaleCostiBase * (formData.percCommissione / 100);
    const maggiorazioneVal = totaleCostiBase * (formData.percMaggiorazione / 100);
    const subTotale = totaleCostiBase + commissioneVal + maggiorazioneVal;

    // Totale finale al cliente
    const totaleFinale = subTotale - formData.sconto;
    
    // Margine Agenzia stimato (Totale incassato - costi vivi - eventuali spese)
    const margineAgenzia = totaleFinale - totaleCostiBase;

    return {
      costiMusicisti,
      costiImpianti,
      costiCoordinator,
      speseViaggio,
      totaleCostiBase,
      commissioneVal,
      maggiorazioneVal,
      totaleFinale,
      margineAgenzia
    };
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.client) return alert("Inserisci almeno il nome del cliente!");

    const newQuote = {
      id: `PRV-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      client: formData.client || 'Cliente Sconosciuto',
      type: formData.type,
      date: formData.date || 'Da definire',
      location: formData.location || 'Da definire',
      band: formData.band,
      total: calc.totaleFinale,
      status: 'In attesa'
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Componi Preventivo</h2>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Luogo / Città</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="es. Siena" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* SEZIONE 2: Servizi e Staff (I Moltiplicatori) */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <Music size={18} className="text-blue-500"/> Servizi, Staff e Logistica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Formazione (Descrizione per PDF)</label>
                  <input type="text" name="band" value={formData.band} onChange={handleChange} placeholder="es. Trio (Contrabbasso, Batteria, Piano) + DJ" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Num. Impianti Audio</label>
                  <input type="number" name="numImpianti" min="0" value={formData.numImpianti} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
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
                <div className="md:col-span-3 mt-2 border-t border-slate-200 pt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Spese Viaggio / Trasferta (€)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">€</div>
                    <input type="number" name="speseViaggio" min="0" value={formData.speseViaggio} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Calcola con ViaMichelin / numero macchine in base alla location ({formData.location || 'Da definire'})</p>
                </div>
              </div>
            </div>

            {/* SEZIONE 3: Aggiustamenti di Prezzo */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <Calculator size={18} className="text-blue-500"/> Variabili e Sconti
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commissione WP (%)</label>
                  <input type="number" name="percCommissione" min="0" value={formData.percCommissione} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maggiorazione (%)</label>
                  <input type="number" name="percMaggiorazione" min="0" value={formData.percMaggiorazione} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sconto Finale (€)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">-</div>
                    <input type="number" name="sconto" min="0" value={formData.sconto} onChange={handleChange} className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-red-600 font-medium" />
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
              {formData.usaCoordinator && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Event Coordinator</span>
                  <span>€ {calc.costiCoordinator.toLocaleString('it-IT')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-300">
                <span>Trasferta</span>
                <span>€ {calc.speseViaggio.toLocaleString('it-IT')}</span>
              </div>
              
              <div className="border-t border-slate-600 pt-2 flex justify-between items-center font-medium text-slate-200">
                <span>Totale Costi Base</span>
                <span>€ {calc.totaleCostiBase.toLocaleString('it-IT')}</span>
              </div>

              {calc.commissioneVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400 pt-2">
                  <span>Commissione Agenzia ({formData.percCommissione}%)</span>
                  <span>+ € {calc.commissioneVal.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
                </div>
              )}
              {calc.maggiorazioneVal > 0 && (
                <div className="flex justify-between items-center text-yellow-400">
                  <span>Maggiorazione ({formData.percMaggiorazione}%)</span>
                  <span>+ € {calc.maggiorazioneVal.toLocaleString('it-IT', {maximumFractionDigits: 0})}</span>
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
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Da comunicare al cliente (escl. IVA)</p>
              <div className="text-3xl font-bold text-white mb-4">
                € {calc.totaleFinale.toLocaleString('it-IT', {maximumFractionDigits: 0})}
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

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    const element = document.getElementById('preventivo-container');
    const opt = {
      margin:       10,
      filename:     `Preventivo_${quote.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Carica dinamicamente la libreria se non è già presente
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save().then(() => setIsGenerating(false));
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save().then(() => setIsGenerating(false));
      };
      document.body.appendChild(script);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center animate-in fade-in">
      
      {/* Bottoni di controllo esterni al PDF */}
      <div className="max-w-3xl w-full flex justify-end gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-slate-800 rounded-lg transition-colors font-medium shadow-sm">
          <ArrowLeft size={18} /> Chiudi
        </button>
        <button 
          onClick={handleDownloadPdf} 
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-70"
        >
          <Printer size={18} /> {isGenerating ? 'Generazione...' : 'Scarica PDF'}
        </button>
      </div>

      <div id="preventivo-container" className="max-w-3xl w-full bg-white shadow-xl border border-gray-200 p-10 md:p-16 rounded-xl">
        
        {/* Intestazione Preventivo */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">PREVENTIVO</h1>
            <p className="text-slate-500 mt-2 font-mono">{quote.id}</p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-xl mb-3 ml-auto">
              <Music size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Italian Music Designer</h2>
            <p className="text-slate-500 text-sm">Servizi Musicali per Eventi</p>
          </div>
        </div>

        {/* Dettagli Cliente e Evento */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preparato per:</h3>
            <p className="text-lg font-semibold text-slate-800">{quote.client}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dettagli Evento:</h3>
            <p className="text-slate-800 font-medium">{quote.type}</p>
            <p className="text-slate-600">Data: {quote.date}</p>
            <p className="text-slate-600">Luogo: {quote.location}</p>
          </div>
        </div>

        {/* Servizi Inclusi */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Servizi Inclusi nel Pacchetto</h3>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <p className="text-lg font-medium text-slate-900 mb-2">Formazione: {quote.band}</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mt-4">
              <li>Intrattenimento musicale per la durata concordata</li>
              <li>Impianti audio e strumentazione tecnica inclusi</li>
              <li>Assistenza, montaggio e coordinamento in loco</li>
              <li>Spese di trasferta incluse</li>
            </ul>
          </div>
        </div>

        {/* Totale */}
        <div className="flex justify-end border-t border-gray-200 pt-6 mt-12">
          <div className="w-full md:w-1/2">
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Totale Servizi:</span>
              <span className="text-slate-800 font-semibold">€ {quote.total.toLocaleString('it-IT')}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm text-slate-500">
              <span>IVA (se applicabile):</span>
              <span>Da calcolare</span>
            </div>
            <div className="flex justify-between items-center py-4 mt-2 border-t-2 border-slate-900">
              <span className="text-xl font-bold text-slate-900">Totale Finale:</span>
              <span className="text-2xl font-bold text-slate-900">€ {quote.total.toLocaleString('it-IT')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-400 pt-8 border-t border-gray-100">
          <p>Il presente preventivo ha validità 30 giorni dalla data di emissione. <br/>Non sono inclusi permessi SIAE o eventuali tasse locali della location.</p>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPALE (ROUTING)
// ==========================================
export default function App() {
  // Stato iniziale: Array Vuoto come richiesto!
  const [quotes, setQuotes] = useState([]);
  
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
    alert(`Modifica in arrivo per il preventivo: ${id}\nPer ora ho concentrato lo sforzo sulla pagina di creazione.`);
  };

  const handleSaveNewQuote = (newQuote) => {
    setQuotes([...quotes, newQuote]);
    setCurrentView('dashboard'); // Torna alla home
  };

  const handlePrint = (quote) => {
    setSelectedQuote(quote);
    setCurrentView('print');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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