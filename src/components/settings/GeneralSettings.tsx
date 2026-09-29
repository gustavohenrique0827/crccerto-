import React, { useState } from 'react';
import { User, Building2, MapPin, Globe, Camera, Check, Save } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';

export default function GeneralSettings() {
  const { currentClinic, updateClinic, addToast } = useApp();

  const [formData, setFormData] = useState({
    name: currentClinic?.name || 'CRC Odontologia Central',
    corporateName: currentClinic?.corporateName || 'Centro de Relacionamento Central Ltda',
    cnpj: currentClinic?.cnpj || '00.000.000/0001-00',
    email: currentClinic?.email || 'adm@crc.com',
    phone: currentClinic?.phone || '(11) 3333-4444',
    address: currentClinic?.address || 'Av. Paulista, 1000',
    city: currentClinic?.city || 'São Paulo',
    state: currentClinic?.state || 'SP',
    responsible: currentClinic?.responsible || 'Dr. Responsável'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentClinic) {
      updateClinic(currentClinic.id, {
        name: formData.name,
        corporateName: formData.corporateName,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        responsible: formData.responsible
      });
    } else {
      addToast('Configurações gerais salvas com sucesso!', 'success');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Configurações Gerais
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Informações cadastrais e dados operacionais da sua clínica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={16} className="text-blue-500" />
            Dados da Sede / Unidade
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nome Fantasia
              </label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Razão Social
              </label>
              <input 
                type="text" 
                value={formData.corporateName}
                onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                CNPJ
              </label>
              <input 
                type="text" 
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Responsável Técnico
              </label>
              <input 
                type="text" 
                value={formData.responsible}
                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                E-mail Administrativo
              </label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Cidade
              </label>
              <input 
                type="text" 
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Estado (UF)
              </label>
              <input 
                type="text" 
                maxLength={2}
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white uppercase" 
              />
            </div>
          </div>
        </div>

        {/* Branding & Logo */}
        <div className="space-y-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Camera size={16} className="text-blue-500" />
              Identidade Visual
            </h3>
            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 overflow-hidden shadow-sm">
                {currentClinic?.logo ? (
                  <img src={currentClinic.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Globe size={32} />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Logotipo da Clínica</p>
              <p className="text-[10px] text-slate-400 mt-1">PNG, SVG ou JPEG até 5MB</p>
            </div>
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold">Sincronização em Tempo Real</p>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">As alterações refletem imediatamente em todos os relatórios e cabeçalhos.</p>
          </div>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
        <button 
          type="submit" 
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save size={16} />
          <span>Salvar Alterações</span>
        </button>
      </div>
    </form>
  );
}
