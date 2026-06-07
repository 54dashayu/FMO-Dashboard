import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getPlatform } from '../platform'

const WISH_WALL_KEY = 'fmo_wish_wall_items'

export type WishStatus = 'pending' | 'planned' | 'done'

export interface WishItem {
  id: string
  title: string
  detail: string
  author: string
  status: WishStatus
  votes: number
  createdAt: number
  updatedAt: number
}

const statusWeight: Record<WishStatus, number> = {
  pending: 0,
  planned: 1,
  done: 2
}

function normalizeWish(raw: Partial<WishItem>): WishItem | null {
  const title = String(raw.title || '').trim()
  if (!title) return null

  const status = ['pending', 'planned', 'done'].includes(String(raw.status))
    ? (raw.status as WishStatus)
    : 'pending'
  const now = Date.now()

  return {
    id: String(raw.id || `wish-${now}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    detail: String(raw.detail || '').trim(),
    author: String(raw.author || '').trim(),
    status,
    votes: Math.max(0, Number(raw.votes) || 0),
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || now
  }
}

export const useWishWallStore = defineStore('wishWall', () => {
  const wishes = ref<WishItem[]>([])
  const loaded = ref(false)

  const sortedWishes = computed(() =>
    [...wishes.value].sort((a, b) => {
      if (a.status !== b.status) return statusWeight[a.status] - statusWeight[b.status]
      if (a.votes !== b.votes) return b.votes - a.votes
      return b.createdAt - a.createdAt
    })
  )

  const stats = computed(() => ({
    total: wishes.value.length,
    pending: wishes.value.filter((wish) => wish.status === 'pending').length,
    planned: wishes.value.filter((wish) => wish.status === 'planned').length,
    done: wishes.value.filter((wish) => wish.status === 'done').length
  }))

  async function persist() {
    await getPlatform().storage.set(WISH_WALL_KEY, JSON.stringify(wishes.value))
  }

  async function loadWishes() {
    if (loaded.value) return
    const saved = await getPlatform().storage.get(WISH_WALL_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          wishes.value = parsed.map(normalizeWish).filter(Boolean) as WishItem[]
        }
      } catch (err) {
        console.warn('[WishWall] load failed:', err)
      }
    }
    loaded.value = true
  }

  async function addWish(payload: { title: string; detail?: string; author?: string }) {
    const now = Date.now()
    const wish = normalizeWish({
      id: `wish-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: payload.title,
      detail: payload.detail,
      author: payload.author,
      status: 'pending',
      votes: 1,
      createdAt: now,
      updatedAt: now
    })
    if (!wish) return null
    wishes.value.unshift(wish)
    await persist()
    return wish
  }

  async function voteWish(id: string) {
    const wish = wishes.value.find((item) => item.id === id)
    if (!wish) return
    wish.votes += 1
    wish.updatedAt = Date.now()
    await persist()
  }

  async function setWishStatus(id: string, status: WishStatus) {
    const wish = wishes.value.find((item) => item.id === id)
    if (!wish) return
    wish.status = status
    wish.updatedAt = Date.now()
    await persist()
  }

  async function removeWish(id: string) {
    wishes.value = wishes.value.filter((wish) => wish.id !== id)
    await persist()
  }

  return {
    wishes,
    loaded,
    sortedWishes,
    stats,
    loadWishes,
    addWish,
    voteWish,
    setWishStatus,
    removeWish
  }
})
