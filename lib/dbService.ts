import { collection, getDocs, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { db, firebaseConfigured } from './firebase';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  affiliation: string;
  timestamp: string;
  equipment: string;
}

const LOCAL_STORAGE_KEY = 'esteira_tech_leads';

const getLocalLeads = (): Lead[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const setLocalLeads = (leads: Lead[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
  }
};

export const isFirebaseActive = (): boolean => {
  return firebaseConfigured && db !== null;
};

export const getLeads = async (): Promise<Lead[]> => {
  if (!isFirebaseActive()) {
    return getLocalLeads();
  }

  try {
    const leadsRef = collection(db!, 'leads');
    const q = query(leadsRef);
    const querySnapshot = await getDocs(q);
    const leads: Lead[] = [];
    querySnapshot.forEach((docSnapshot) => {
      leads.push({ id: docSnapshot.id, ...docSnapshot.data() } as Lead);
    });

    // Ordenar leads por data decrescente (mais recentes primeiro)
    // O formato do timestamp é 'dd/mm/yyyy hh:mm' (ex: '16/06/2026 10:15')
    leads.sort((a, b) => {
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const [date, time] = dStr.split(' ');
        if (!date || !time) return 0;
        const [day, month, year] = date.split('/').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute).getTime();
      };
      try {
        return parseDate(b.timestamp) - parseDate(a.timestamp);
      } catch (e) {
        return 0;
      }
    });

    // Atualiza o localStorage para servir como cache offline
    setLocalLeads(leads);
    return leads;
  } catch (error) {
    console.error('Erro ao ler leads do Firestore, caindo de volta para LocalStorage:', error);
    return getLocalLeads();
  }
};

export const addLead = async (lead: Lead): Promise<void> => {
  // Sincronizar com o localStorage primeiro
  const local = getLocalLeads();
  const updated = [lead, ...local];
  setLocalLeads(updated);

  if (isFirebaseActive()) {
    try {
      await setDoc(doc(db!, 'leads', lead.id), {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        affiliation: lead.affiliation,
        timestamp: lead.timestamp,
        equipment: lead.equipment
      });
    } catch (error) {
      console.error('Erro ao salvar lead no Firestore:', error);
      throw error;
    }
  }
};

export const removeLead = async (id: string): Promise<void> => {
  // Sincronizar com o localStorage primeiro
  const local = getLocalLeads();
  const updated = local.filter((l) => l.id !== id);
  setLocalLeads(updated);

  if (isFirebaseActive()) {
    try {
      await deleteDoc(doc(db!, 'leads', id));
    } catch (error) {
      console.error('Erro ao remover lead do Firestore:', error);
      throw error;
    }
  }
};

export const clearLocalLeads = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};
