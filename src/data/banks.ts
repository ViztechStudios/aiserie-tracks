/**
 * Built-in Philippine banks & e-wallets with official brand tiles.
 * Tiles are white rounded squares so they sit consistently on glass.
 */
import { ImageSourcePropType } from 'react-native';
import { AccountType } from '../types';

import aub from '../../assets/banks/aub.png';
import bdo from '../../assets/banks/bdo.png';
import bpi from '../../assets/banks/bpi.png';
import cash from '../../assets/banks/cash.png';
import chinabank from '../../assets/banks/chinabank.png';
import cimb from '../../assets/banks/cimb.png';
import coinsph from '../../assets/banks/coinsph.png';
import eastwest from '../../assets/banks/eastwest.png';
import gcash from '../../assets/banks/gcash.png';
import gotyme from '../../assets/banks/gotyme.png';
import grabpay from '../../assets/banks/grabpay.png';
import landbank from '../../assets/banks/landbank.png';
import maribank from '../../assets/banks/maribank.png';
import maya from '../../assets/banks/maya.png';
import metrobank from '../../assets/banks/metrobank.png';
import pnb from '../../assets/banks/pnb.png';
import psbank from '../../assets/banks/psbank.png';
import rcbc from '../../assets/banks/rcbc.png';
import securitybank from '../../assets/banks/securitybank.png';
import shopeepay from '../../assets/banks/shopeepay.png';
import tonik from '../../assets/banks/tonik.png';
import unionbank from '../../assets/banks/unionbank.png';

export interface BankDef {
  id: string;
  name: string;
  type: AccountType;
  /** Brand accent used for chips/highlights around the tile. */
  color: string;
  logo: ImageSourcePropType;
}

export const EWALLETS: BankDef[] = [
  { id: 'gcash', name: 'GCash', type: 'ewallet', color: '#007DFE', logo: gcash },
  { id: 'maya', name: 'Maya', type: 'ewallet', color: '#21C064', logo: maya },
  { id: 'coinsph', name: 'Coins.ph', type: 'ewallet', color: '#06AEEF', logo: coinsph },
  { id: 'grabpay', name: 'GrabPay', type: 'ewallet', color: '#00B14F', logo: grabpay },
  { id: 'shopeepay', name: 'ShopeePay', type: 'ewallet', color: '#EE4D2D', logo: shopeepay },
];

export const BANKS: BankDef[] = [
  { id: 'bpi', name: 'BPI', type: 'bank', color: '#C6363C', logo: bpi },
  { id: 'bdo', name: 'BDO', type: 'bank', color: '#0A54A8', logo: bdo },
  { id: 'metrobank', name: 'Metrobank', type: 'bank', color: '#0B4EA2', logo: metrobank },
  { id: 'aub', name: 'AUB', type: 'bank', color: '#B23A32', logo: aub },
  { id: 'unionbank', name: 'UnionBank', type: 'bank', color: '#F7941E', logo: unionbank },
  { id: 'securitybank', name: 'Security Bank', type: 'bank', color: '#58A24C', logo: securitybank },
  { id: 'landbank', name: 'Landbank', type: 'bank', color: '#4E9F44', logo: landbank },
  { id: 'rcbc', name: 'RCBC', type: 'bank', color: '#4E86C6', logo: rcbc },
  { id: 'pnb', name: 'PNB', type: 'bank', color: '#1A5091', logo: pnb },
  { id: 'chinabank', name: 'China Bank', type: 'bank', color: '#C4382E', logo: chinabank },
  { id: 'eastwest', name: 'EastWest Bank', type: 'bank', color: '#C13F7E', logo: eastwest },
  { id: 'psbank', name: 'PSBank', type: 'bank', color: '#C62828', logo: psbank },
  { id: 'maribank', name: 'Maribank', type: 'bank', color: '#F97316', logo: maribank },
  { id: 'gotyme', name: 'GoTyme', type: 'bank', color: '#1EC8E0', logo: gotyme },
  { id: 'cimb', name: 'CIMB Bank', type: 'bank', color: '#D6252B', logo: cimb },
  { id: 'tonik', name: 'Tonik', type: 'bank', color: '#876BE8', logo: tonik },
];

export const CASH_DEF: BankDef = {
  id: 'cash',
  name: 'Cash',
  type: 'cash',
  color: '#16B98A',
  logo: cash,
};

export const ALL_BRANDS: BankDef[] = [...EWALLETS, ...BANKS, CASH_DEF];

const BY_ID = new Map(ALL_BRANDS.map((b) => [b.id, b]));

export function getBrand(id: string | undefined | null): BankDef | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}
