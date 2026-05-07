export type ClienteEstado = 'Pendiente' | 'Revisar' | 'Resuelto';

export interface Cliente {
  id?: string;
  nombre: string;
  numeroCliente: string;
  numeroPrecinto: string;
  latitud: number;
  longitud: number;
  direccion: string;
  telefono: string;
  observacion: string;
  fotos: string[];
  estado: ClienteEstado;
  fecha: any; // Firestore Timestamp
  zona?: string;
}

export type Screen = 'home' | 'identify' | 'search' | 'admin' | 'tasks-plus';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface Task {
  id: string;
  item: string;
  comment: string;
  photo: string | null;
  coords: string | null;
  finished: boolean;
  finalComment?: string;
  createdAt: string;
  finalizedAt?: string;
}
