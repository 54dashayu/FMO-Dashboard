/**
 * Maidenhead Grid 校验与归一化（与平台无关的纯函数）。
 */

export interface GridValidation {
  valid: boolean
  grid?: string
  error?: string
}

export function normalizeGrid(grid: string | null | undefined): string {
  if (!grid) return ''
  return grid.trim().toUpperCase()
}

export function validateGrid(grid: string | null | undefined): GridValidation {
  if (!grid) {
    return { valid: false, error: '缺少 grid 参数' }
  }
  const normalized = normalizeGrid(grid)

  if (
    normalized.length < 4 ||
    normalized.length > 8 ||
    normalized.length % 2 !== 0
  ) {
    return { valid: false, error: 'grid 长度必须在 4-8 字符之间且为偶数长度' }
  }

  const fieldPart = normalized.substring(0, 2)
  if (!/^[A-R]{2}$/.test(fieldPart)) {
    return { valid: false, error: 'grid 前两位必须是 A-R 之间的字母' }
  }

  const squarePart = normalized.substring(2, 4)
  if (!/^[0-9]{2}$/.test(squarePart)) {
    return { valid: false, error: 'grid 第3-4位必须是数字' }
  }

  if (normalized.length >= 6) {
    const subSquarePart = normalized.substring(4, 6)
    if (!/^[A-X]{2}$/.test(subSquarePart)) {
      return { valid: false, error: 'grid 第5-6位必须是 A-X 之间的字母' }
    }
  }

  if (normalized.length >= 8) {
    const extSquarePart = normalized.substring(6, 8)
    if (!/^[0-9]{2}$/.test(extSquarePart)) {
      return { valid: false, error: 'grid 第7-8位必须是数字' }
    }
  }

  return { valid: true, grid: normalized }
}
