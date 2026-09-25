import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- COMPONENTE PRINCIPAL DO PAINEL ---
function Dashboard({ token, onLogout, onGoToRegister }) {
  const [currentView, setCurrentView] = useState('dashboard');
  
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [userData, setUserData] = useState(null);
  const [statements, setStatements] = useState([]); 
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [aiError, setAiError] = useState(false); 
  const [demoBlocked, setDemoBlocked] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState(''); 
  
  const [selectedTableStatementId, setSelectedTableStatementId] = useState(''); 
  
  const [editingTxId, setEditingTxId] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [deletingTxId, setDeletingTxId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '', key: 0 }); 
  const fileInputRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const isDemo = userData?.email === 'demo@finsight.com';

  const showToast = (message, type) => {
    setToast({ show: true, message, type, key: Date.now() });
  };

  const closeToast = () => setToast(prev => ({ ...prev, show: false }));

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(closeToast, 4000);
      return () => clearTimeout(timer); 
    }
  }, [toast.show, toast.key]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setUserData(await response.json());
    } catch (error) { console.error("Erro ao buscar dados", error); }
  };

  const fetchTransactions = async () => {
    try {
      const url = selectedTableStatementId 
        ? `${API_URL}/api/transactions?statementId=${selectedTableStatementId}` 
        : `${API_URL}/api/transactions`;
      
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setTransactions(await response.json());
    } catch (error) { console.error("Erro ao buscar transações", error); }
  };

  useEffect(() => {
    if (token) fetchTransactions();
  }, [selectedTableStatementId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/insights/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setHistory(await response.json());
    } catch (error) { console.error("Erro ao buscar histórico", error); }
  };

  const fetchStatements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/statements`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setStatements(data);
        if (data.length > 0 && !selectedStatementId) {
          setSelectedStatementId(data[data.length - 1].id);
        }
      }
    } catch (error) { console.error("Erro ao buscar extratos", error); }
  };

  useEffect(() => {
    fetchUser();
    fetchTransactions();
    fetchHistory();
    fetchStatements();
  }, [token]);

  const fetchInsight = async () => {
    if (isDemo) { setDemoBlocked(true); return; }
    
    setAiLoading(true);
    setAiError(false); 
    setAiInsight(''); 
    
    try {
      const url = selectedStatementId 
        ? `${API_URL}/api/transactions/insights?statementId=${selectedStatementId}` 
        : `${API_URL}/api/transactions/insights`;

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      
      if (response.ok || response.status === 403) {
        const textLower = data.insight.toLowerCase();
        if (textLower.includes('demanda') || textLower.includes('erro')) {
          setAiError(true);
          showToast('Servidores da IA muito ocupados no momento.', 'error');
        } else {
          setAiInsight(data.insight);
          fetchUser(); 
          fetchHistory();
        }
      } else { throw new Error("Erro no servidor"); }
    } catch (error) { 
      setAiError(true); 
      showToast('Servidores da IA muito ocupados no momento.', 'error'); 
    } finally { setAiLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/statements/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Extrato processado com sucesso!', 'success');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchTransactions(); 
        fetchStatements(); 
        setAiInsight(''); 
        fetchUser();
      } else { showToast(data.error || 'Erro ao processar o arquivo.', 'error'); }
    } catch (error) { showToast('Erro de conexão com o servidor.', 'error'); } 
    finally { setLoading(false); }
  };

  const handleEditCategory = async (id) => {
    if (isDemo) {
      showToast('A edição é desativada na conta de demonstração.', 'error');
      setEditingTxId(null); return;
    }
    if (!editCategoryValue.trim()) { setEditingTxId(null); return; }

    const novaCategoria = editCategoryValue.trim();
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, category: novaCategoria } : tx));
    setEditingTxId(null);

    try {
      const response = await fetch(`${API_URL}/api/transactions/${id}/category`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: novaCategoria })
      });
      if (response.ok) { showToast('Categoria atualizada!', 'success'); } 
      else { showToast('Erro ao atualizar categoria.', 'error'); fetchTransactions(); }
    } catch (error) { showToast('Erro de conexão.', 'error'); fetchTransactions(); }
  };

  const handleDeleteTransaction = async (id) => {
    if (isDemo) {
      showToast('A exclusão é desativada na conta de demonstração.', 'error');
      setDeletingTxId(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showToast('Transação excluída com sucesso!', 'success');
        fetchTransactions(); 
      } else {
        showToast('Erro ao excluir transação.', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão.', 'error');
    } finally {
      setDeletingTxId(null);
    }
  };

  const confirmDeleteAccount = async () => {
    if (isDemo) {
      showToast('Ação bloqueada: A conta de demonstração não pode ser excluída.', 'error');
      setShowDeleteModal(false); return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/transactions/account`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      if (response.ok) {
        setShowDeleteModal(false); 
        showToast('Sua conta e dados foram apagados para sempre. Até logo!', 'success'); 
        setTimeout(() => { onLogout(); }, 2500); 
      } else {
        showToast('Não foi possível excluir a conta. Tente novamente.', 'error');
        setShowDeleteModal(false); setIsDeleting(false);
      }
    } catch (error) { 
      showToast('Erro de comunicação com o servidor Java.', 'error'); 
      setShowDeleteModal(false); setIsDeleting(false);
    }
  };

  const handleLogoutClick = () => {
    showToast('Saindo da conta. Até logo!', 'success');
    setTimeout(() => { onLogout(); }, 1200);
  };

  const expensesByCategory = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Math.abs(curr.amount); return acc;
  }, {});
  const pieData = Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] }));
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const barData = [{ name: 'Resumo do Mês', Entradas: totalIncome, Saídas: totalExpense }];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans text-gray-800 dark:text-gray-100 relative transition-colors duration-300">
      <style>{`
        @keyframes progress-shrink { 0% { width: 100%; } 100% { width: 0%; } } 
        .animate-progress { animation: progress-shrink 4s linear forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
      `}</style>

      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-down max-w-sm w-full">
          <div className={`relative overflow-hidden px-6 py-4 rounded-xl shadow-xl flex items-start sm:items-center gap-4 text-white font-semibold pr-12 transition-colors ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            <span className="text-xl mt-0.5 sm:mt-0">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
            <button onClick={closeToast} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1">✕</button>
            <div key={toast.key} className="absolute bottom-0 left-0 h-1 bg-white/40 animate-progress"></div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform scale-100 transition-all">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
            <h3 className="text-2xl font-black text-center text-gray-800 dark:text-white mb-2">Excluir Conta?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 leading-relaxed">
              Esta ação é irreversível. Todos os seus extratos, históricos de IA e transações serão apagados para sempre.
            </p>
            <div className="flex flex-col gap-3">
              <button disabled={isDeleting} onClick={confirmDeleteAccount} className="w-full px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-red-400 transition shadow-md">
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Permanentemente'}
              </button>
              <button disabled={isDeleting} onClick={() => setShowDeleteModal(false)} className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Cancelar e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm mb-8 gap-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
          <h1 className="text-2xl font-black text-blue-900 dark:text-blue-400 tracking-tight cursor-pointer" onClick={() => setCurrentView('dashboard')}>FinSight</h1>
          
          {!isDemo && userData && (
            <div className="flex gap-2">
              <div className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm ${userData.aiTokens > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/50'}`}>
                🪙 {userData.aiTokens} IA
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm ${userData.statementTokens > 0 ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/50' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/50'}`}>
                📄 {userData.statementTokens ?? 0} Extratos
              </div>
            </div>
          )}
        </div>

        <nav className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <button onClick={() => setCurrentView('dashboard')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${currentView === 'dashboard' ? 'text-blue-700 dark:text-blue-400' : ''}`}>Painel</button>
          <button onClick={() => setCurrentView('history')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${currentView === 'history' ? 'text-blue-700 dark:text-blue-400' : ''}`}>Histórico IA</button>
          <button onClick={() => setCurrentView('account')} className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${currentView === 'account' ? 'text-blue-700 dark:text-blue-400' : ''}`}>Minha Conta</button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block"></div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-xl p-1 hover:scale-110 transition-transform">{isDarkMode ? '☀️' : '🌙'}</button>
          <button onClick={handleLogoutClick} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">Sair</button>
        </nav>
      </header>

      {currentView === 'dashboard' && (
        <div className="animate-fade-in-up">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-800 p-6 sm:p-8 rounded-2xl shadow-lg mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 transform hover:scale-[1.01] transition-transform duration-300">
            <div className="flex items-start gap-4 w-full md:w-3/4">
              <div className="text-4xl animate-bounce">✨</div>
              <div className="w-full">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <h3 className="font-bold text-xl tracking-wide text-blue-100">FinSight AI Analysis</h3>
                  
                  {!isDemo && statements.length > 0 && (
                    <div className="relative w-full sm:w-auto">
                      <select 
                        value={selectedStatementId} 
                        onChange={(e) => setSelectedStatementId(e.target.value)}
                        className="w-full sm:max-w-[200px] md:max-w-[280px] bg-white/10 hover:bg-white/20 border border-white/30 text-blue-50 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none outline-none transition-colors truncate"
                      >
                        <option value="" className="text-gray-800 dark:text-gray-200 dark:bg-gray-800">Todos os Extratos</option>
                        {statements.map(s => (
                          <option key={s.id} value={s.id} className="text-gray-800 dark:text-gray-200 dark:bg-gray-800">
                            📄 {s.fileName}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/70">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  )}
                </div>
                
                {isDemo ? (
                  <div className="mt-2">
                    <p className="text-sm leading-relaxed text-blue-50 mb-4 opacity-90">A IA é um recurso exclusivo. Crie sua conta gratuita para desbloquear análises automáticas!</p>
                    <button onClick={onGoToRegister} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all">Criar Minha Conta</button>
                  </div>
                ) : aiLoading ? (
                  <div className="animate-pulse flex space-x-4 mt-4">
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-2 bg-blue-400 rounded w-3/4"></div>
                      <div className="h-2 bg-blue-400 rounded w-5/6"></div>
                      <div className="h-2 bg-blue-400 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : aiError ? ( 
                  <div className="mt-2">
                    <p className="text-sm leading-relaxed text-red-200 mb-4 opacity-90">Os servidores do Google Gemini estão com alta demanda no momento. Não se preocupe, seus tokens não foram gastos.</p>
                    <button onClick={fetchInsight} className="bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center gap-2"><span>🔄</span> Tentar Novamente</button>
                  </div>
                ) : aiInsight ? (
                  <div className="mt-4 bg-white/10 rounded-xl border border-white/20 shadow-inner flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-white/10 bg-black/10">
                      <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Relatório Gerado</span>
                      <button 
                        onClick={() => setAiInsight('')} 
                        className="text-blue-200 hover:text-white text-xs font-bold px-2 py-1 bg-white/5 hover:bg-white/20 rounded transition-colors"
                        title="Nova Análise"
                      >
                        ✕ FECHAR
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-blue-50 p-4 whitespace-pre-line">
                      {aiInsight}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-100 opacity-80 mt-2">Selecione um extrato e gere um relatório inteligente. Custo: 1 Token.</p>
                )}
              </div>
            </div>

            {!isDemo && !aiInsight && !aiLoading && !aiError && (
              <button onClick={fetchInsight} className="whitespace-nowrap bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md mt-4 md:mt-0">
                Gerar Relatório
              </button>
            )}
          </div>

          {transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Despesas por Categoria</h3>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><Legend /></PieChart></ResponsiveContainer></div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Balanço do Mês</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#4b5563'} />
                      <YAxis stroke={isDarkMode ? '#9ca3af' : '#4b5563'} />
                      <Tooltip cursor={false} formatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                      <Legend />
                      <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {isDemo ? (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-600 text-center transition-colors duration-300">
                 <div className="text-5xl mb-4 opacity-70">📁</div>
                 <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">Importar Extrato</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">O upload é desativado na conta de demonstração. Crie sua conta para analisar seus arquivos.</p>
                 <button onClick={onGoToRegister} className="w-full bg-blue-900 dark:bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition">Criar Conta Gratuita</button>
               </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit transition-colors duration-300">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Importar Extrato</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                  <input type="file" ref={fileInputRef} accept=".ofx, .csv" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 cursor-pointer transition-colors"/>
                  <button type="submit" disabled={!file || loading} className="w-full bg-blue-900 dark:bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 transition">
                    {loading ? 'Processando...' : 'Enviar Arquivo'}
                  </button>
                </form>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">Consome 1 Token de Extrato</p>
              </div>
            )}

            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300 flex flex-col">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Transações Recentes</h2>
                
                {!isDemo && statements.length > 0 && (
                  <div className="relative w-full sm:w-auto">
                    <select 
                      value={selectedTableStatementId} 
                      onChange={(e) => setSelectedTableStatementId(e.target.value)}
                      className="w-full sm:max-w-[200px] md:max-w-[280px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none outline-none transition-colors truncate"
                    >
                      <option value="" className="dark:bg-gray-800 dark:text-gray-200">Todos os Extratos</option>
                      {statements.map(s => (
                        <option key={s.id} value={s.id} className="dark:bg-gray-800 dark:text-gray-200">
                          📄 {s.fileName}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                )}
              </div>
              
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500"><span className="text-4xl mb-3">🧾</span><p>Nenhuma transação encontrada.</p></div>
              ) : (
                <div className="overflow-y-auto max-h-[400px] border border-gray-100 dark:border-gray-700/50 rounded-xl relative custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 shadow-sm">
                      <tr className="border-b-2 border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <th className="py-3 px-4 bg-gray-50 dark:bg-gray-800 whitespace-nowrap">Data</th>
                        <th className="py-3 px-4 bg-gray-50 dark:bg-gray-800">Descrição</th>
                        <th className="py-3 px-4 bg-gray-50 dark:bg-gray-800">Categoria</th>
                        <th className="py-3 px-4 bg-gray-50 dark:bg-gray-800 text-right whitespace-nowrap">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{tx.date.split('-').reverse().join('/')}</td>
                          <td className="py-4 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">{tx.description}</td>
                          <td className="py-4 px-4">
                            {editingTxId === tx.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" autoFocus value={editCategoryValue} onChange={(e) => setEditCategoryValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditCategory(tx.id)} className="px-2 py-1 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white w-28 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                                <button onClick={() => handleEditCategory(tx.id)} className="text-emerald-500 hover:text-emerald-600" title="Salvar">✅</button>
                                <button onClick={() => setEditingTxId(null)} className="text-red-500 hover:text-red-600" title="Cancelar">❌</button>
                              </div>
                            ) : deletingTxId === tx.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-500 mr-1">Excluir?</span>
                                <button onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-600" title="Confirmar exclusão">✅</button>
                                <button onClick={() => setDeletingTxId(null)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" title="Cancelar">❌</button>
                              </div>
                            ) : (
                              <div className="flex items-center group">
                                <span className="inline-flex items-center whitespace-nowrap bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs font-semibold">{tx.category}</span>
                                
                                {!isDemo && (
                                  <div className="flex items-center gap-3 ml-2 border-l border-gray-200 dark:border-gray-600 pl-3">
                                    <button 
                                      onClick={() => { setEditingTxId(tx.id); setEditCategoryValue(tx.category); setDeletingTxId(null); }} 
                                      className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-sm" 
                                      title="Editar categoria"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={() => { setDeletingTxId(tx.id); setEditingTxId(null); }} 
                                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm" 
                                      title="Excluir transação"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`py-4 px-4 text-sm font-bold text-right whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : ''}{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentView === 'history' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[60vh] animate-fade-in-up transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><span>📚</span> Histórico de Análises</h2>
          {history.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-12">Nenhuma análise foi gerada ainda.</p> : (
            <div className="space-y-6">
              {history.map(report => (
                <div key={report.id} className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 p-6 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-blue-900 dark:text-blue-400">Relatório FinSight</h3>
                    <span className="text-xs font-semibold text-blue-400 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">{new Date(report.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{report.insightText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentView === 'account' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto animate-fade-in-up transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><span>⚙️</span> Configurações da Conta</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl">{userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
              <div><h3 className="font-bold text-gray-800 dark:text-gray-100">{userData?.name || 'Usuário'}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{userData?.email}</p></div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6 transition-colors">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ao excluir sua conta, todos os seus dados serão apagados permanentemente.</p>
              
              {isDemo ? (
                <button disabled className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-bold py-2.5 px-6 rounded-xl cursor-not-allowed">
                  Desativado na Conta Demo
                </button>
              ) : (
                <button onClick={() => setShowDeleteModal(true)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                  Excluir Conta Permanentemente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- TELA DE LOGIN E CADASTRO ---
function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false); 
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        if (data.message.toLowerCase().includes("verifique seu e-mail")) setIsVerifying(true);
        else { setIsLogin(true); setPassword(''); }
      } else setError(data.error || 'Erro ao criar conta.');
    } catch (err) { setError('Erro de conexão com o servidor Java.'); } finally { setAuthLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: verificationCode }) });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Conta ativada com sucesso! Faça login.');
        setIsVerifying(false); setIsLogin(true); setVerificationCode(''); setPassword('');
      } else setError(data.error || 'Código inválido.');
    } catch (err) { setError('Erro de conexão.'); } finally { setAuthLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (response.ok) { localStorage.setItem('token', data.token); setToken(data.token); } 
      else {
        setError(data.error || 'Email ou senha incorretos!');
        if (data.error && data.error.toLowerCase().includes("inativa")) setIsVerifying(true);
      }
    } catch (err) { setError('Erro de conexão.'); } finally { setAuthLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(''); };
  const handleGoToRegister = () => {
    localStorage.removeItem('token'); setToken(''); setIsLogin(false); setIsVerifying(false); setError(''); setSuccess(''); setName(''); setEmail(''); setPassword('');
  };

  if (token) return <Dashboard token={token} onLogout={handleLogout} onGoToRegister={handleGoToRegister} />;

  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <h1 className="text-4xl font-black text-center text-blue-900 dark:text-blue-400 mb-2 tracking-tight">FinSight</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 font-medium">{isVerifying ? 'Verifique seu e-mail' : (isLogin ? 'Acesse sua conta para continuar' : 'Crie sua conta gratuita')}</p>
        
        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 text-center font-semibold animate-pulse">{error}</div>}
        {success && <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-sm mb-6 text-center font-semibold">{success}</div>}

        {isVerifying ? (
          <form onSubmit={handleVerify} className="space-y-5 animate-fade-in-up">
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">Enviamos um código de 6 dígitos para <br/><strong className="text-blue-900 dark:text-blue-400 block mt-1">{email}</strong></p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 text-center">Código de Verificação</label>
              <input type="text" maxLength="6" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 text-center text-3xl tracking-[0.4em] font-black transition-colors" placeholder="000000" required/>
            </div>
            
            <button disabled={authLoading} type="submit" className="w-full bg-blue-900 dark:bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-800 dark:hover:bg-blue-700 transition-all flex justify-center items-center disabled:opacity-75">
              {authLoading ? <><LoadingSpinner /> Verificando...</> : 'Confirmar Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5 animate-fade-in-up">
            {!isLogin && <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 transition-colors" required/></div>}
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 transition-colors" required/></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 transition-colors" required/></div>
            
            <button disabled={authLoading} type="submit" className="w-full bg-blue-900 dark:bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-800 dark:hover:bg-blue-700 transition-all flex justify-center items-center disabled:opacity-75">
              {authLoading ? (
                <><LoadingSpinner /> Processando...</>
              ) : (
                isLogin ? 'Entrar' : 'Criar Conta'
              )}
            </button>
          </form>
        )}

        {!isVerifying && (
          <>
            <div className="mt-6 text-center"><button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">{isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}</button></div>
            {isLogin && <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center transition-colors"><button type="button" onClick={() => { setEmail('demo@finsight.com'); setPassword('demo123'); }} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-4 py-2.5 rounded-xl w-full border border-blue-100 dark:border-blue-800 transition-colors">Acessar Conta Demo (Recrutador)</button></div>}
          </>
        )}
      </div>
    </div>
  );
}
export default App;