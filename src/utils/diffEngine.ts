// src/utils/diffEngine.ts
import type { ProjectData, Person, Session } from '../types';

export interface DiffRecord {
  type: 'removed' | 'added' | 'seat_changed' | 'seat_replaced' | 'photo_changed';
  personName: string;
  personOrg: string;
  originalLocation: string;
  newLocation: string;
  description: string;
}

export const calculateVersionDiff = (oldData: ProjectData, newData: ProjectData, activeSessionId: string): DiffRecord[] => {
  const diffs: DiffRecord[] = [];

  const newSession = newData.sessions?.find(s => s.id === activeSessionId);
  const oldSession = oldData.sessions?.find(s => s.id === activeSessionId || s.name === newSession?.name);

  if (!newSession) return diffs;

  const getPersonKey = (p: Person) => p.externalId || p.name;
  
  const oldPeople = new Map((oldData.personnel || []).map(p => [getPersonKey(p), p]));
  const newPeople = new Map((newData.personnel || []).map(p => [getPersonKey(p), p]));

  const oldSeats = oldSession ? oldSession.venue.seats : [];
  const newSeats = newSession.venue.seats;

  const oldSeatByPerson = new Map<string, string>();
  const oldPersonBySeat = new Map<string, Person>();
  oldSeats.forEach(s => {
    if (s.assignedPersonId && s.type !== 'shape') {
      const p = oldData.personnel?.find(person => person.id === s.assignedPersonId);
      if (p) {
        oldSeatByPerson.set(getPersonKey(p), s.label);
        oldPersonBySeat.set(s.label, p);
      }
    }
  });

  const newSeatByPerson = new Map<string, string>();
  const newPersonBySeat = new Map<string, Person>();
  newSeats.forEach(s => {
    if (s.assignedPersonId && s.type !== 'shape') {
      const p = newData.personnel?.find(person => person.id === s.assignedPersonId);
      if (p) {
        newSeatByPerson.set(getPersonKey(p), s.label);
        newPersonBySeat.set(s.label, p);
      }
    }
  });

  // 取得拍照動線資訊
  const getPhotoSpots = (session: Session | undefined, data: ProjectData) => {
    const photoMap = new Map<string, string[]>(); // key: personKey, value: ['一拍(前左1)', ...]
    if (!session || !session.photoBatches) return photoMap;
    
    session.photoBatches.forEach(batch => {
      batch.spots.forEach(spot => {
        if (spot.assignedPersonId) {
          const p = data.personnel?.find(person => person.id === spot.assignedPersonId);
          if (p) {
            const pKey = getPersonKey(p);
            const current = photoMap.get(pKey) || [];
            current.push(`${batch.name} (${spot.label})`);
            photoMap.set(pKey, current);
          }
        }
      });
    });
    return photoMap;
  };

  const oldPhotoMap = getPhotoSpots(oldSession, oldData);
  const newPhotoMap = getPhotoSpots(newSession, newData);

  // 1. 偵測座位替換 (Seat Replaced)
  newSeats.forEach(newSeat => {
    if (newSeat.type === 'shape') return;
    const oldPerson = oldPersonBySeat.get(newSeat.label);
    const newPerson = newPersonBySeat.get(newSeat.label);
    
    if (oldPerson && newPerson && getPersonKey(oldPerson) !== getPersonKey(newPerson)) {
      diffs.push({
        type: 'seat_replaced',
        personName: '座位替換',
        personOrg: newSeat.label,
        originalLocation: oldPerson.name,
        newLocation: newPerson.name,
        description: `原：${oldPerson.name} ➡️ 新：${newPerson.name}`
      });
    }
  });

  // 2. 偵測人員所有變動
  const allPersonKeys = new Set([...oldPeople.keys(), ...newPeople.keys()]);

  allPersonKeys.forEach(pKey => {
    const oldP = oldPeople.get(pKey);
    const newP = newPeople.get(pKey);
    
    const oldSeat = oldSeatByPerson.get(pKey);
    const newSeat = newSeatByPerson.get(pKey);

    const oldPhotos = oldPhotoMap.get(pKey) || [];
    const newPhotos = newPhotoMap.get(pKey) || [];

    const personName = newP?.name || oldP?.name || '未知';
    const personOrg = newP?.organization || oldP?.organization || '';

    // [取消/缺席] 舊版有位子/拍照，新版完全沒有
    if ((oldSeat || oldPhotos.length > 0) && !newSeat && newPhotos.length === 0) {
      diffs.push({
        type: 'removed', personName, personOrg,
        originalLocation: oldSeat || oldPhotos.join(', '), newLocation: '未入座/未上台',
        description: '取消出席或移出名單'
      });
      return; // 已處理移除，跳過後續判斷
    }

    // [新增入座] 舊版沒有，新版被排上去了
    if (!oldSeat && oldPhotos.length === 0 && (newSeat || newPhotos.length > 0)) {
      diffs.push({
        type: 'added', personName, personOrg,
        originalLocation: '無', newLocation: newSeat || newPhotos.join(', '),
        description: '新增入座或上台'
      });
      return;
    }

    // [座位異動] 都有入座，但是位子不一樣
    if (oldSeat && newSeat && oldSeat !== newSeat) {
      diffs.push({
        type: 'seat_changed', personName, personOrg,
        originalLocation: oldSeat, newLocation: newSeat,
        description: `座位從 ${oldSeat} 移至 ${newSeat}`
      });
    }

    // [拍照異動]
    const oldPhotoStr = oldPhotos.sort().join('、');
    const newPhotoStr = newPhotos.sort().join('、');
    if (oldPhotoStr !== newPhotoStr && (oldPhotoStr || newPhotoStr)) {
      diffs.push({
        type: 'photo_changed', personName, personOrg,
        originalLocation: oldPhotoStr || '未拍照', newLocation: newPhotoStr || '未拍照',
        description: `動線變更`
      });
    }
  });

  return diffs;
};