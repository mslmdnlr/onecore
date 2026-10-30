/** Topoloji sahnesindeki örnek CMDB nesneleri (demo veri) */
export type CiType = 0 | 1 | 2 | 3;

export interface CiNode {
  name: string;
  type: CiType;
  pos: [number, number, number];
}

export const CI_TYPES = ['Uygulama', 'Sunucu', 'Veritabanı', 'Ağ'];
export const CI_COLORS = ['#71deff', '#bba5ff', '#ffd17c', '#69e7bf'];
export const ROOT_COLOR = '#eaf8ff';

const S = 0.78;
const n = (name: string, type: CiType, x: number, y: number, z: number): CiNode => ({
  name,
  type,
  pos: [x * S, -y * S, z * S],
});

export const CI_NODES: CiNode[] = [
  n('ONECORE', 0, 0, 0, 0),
  n('API Gateway', 0, -1.25, 0.68, 0.16),
  n('Radar', 0, -0.55, 1.35, -0.25),
  n('Kokpit', 0, 0.5, 1.42, 0.24),
  n('CMDB Portal', 0, 1.45, 0.55, 0),
  n('Pusula', 0, 1.2, -0.62, 0.42),
  n('APP-WEB-01', 1, -2.2, 0.85, -0.4),
  n('APP-WEB-02', 1, -1.9, -0.22, 0.52),
  n('K8S-CLUSTER', 1, -0.6, 2.45, -0.25),
  n('APP-SRV-03', 1, 0.5, 2.25, 0.68),
  n('LINUX-01', 1, 2.28, 0.8, -0.46),
  n('WIN-SRV-02', 1, 2.4, -0.65, 0.08),
  n('MSSQL-PRD', 2, -1.65, -1.55, 0.46),
  n('ORACLE-RAC', 2, -0.6, -2.2, -0.23),
  n('POSTGRES-01', 2, 0.85, -1.9, 0.52),
  n('F5 LTM', 3, -2.65, 0.05, -0.76),
  n('F5 GSLB', 3, 1.83, -1.56, -0.62),
  n('FIREWALL', 3, 2.82, 1.55, -0.8),
];

export const CI_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [1, 7], [2, 8], [3, 9], [4, 10], [4, 11], [5, 14],
  [6, 15], [7, 12], [8, 13], [9, 13], [10, 17], [11, 16], [12, 13], [13, 14], [15, 17], [16, 17], [3, 4], [2, 5],
];
