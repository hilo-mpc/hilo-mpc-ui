import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlockType } from '../types/blocks';

interface FavouritesStore {
  favourites: BlockType[];
  toggle: (type: BlockType) => void;
  has: (type: BlockType) => boolean;
}

export const useFavouritesStore = create<FavouritesStore>()(
  persist(
    (set, get) => ({
      favourites: [],

      toggle: (type) =>
        set((s) =>
          s.favourites.includes(type)
            ? { favourites: s.favourites.filter((t) => t !== type) }
            : { favourites: [...s.favourites, type] }
        ),

      has: (type) => get().favourites.includes(type),
    }),
    { name: 'hilo-mpc-favourites' }
  )
);
