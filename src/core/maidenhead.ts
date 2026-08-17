/**
 * 将 WGS84 经纬度转换为 Maidenhead 网格。
 * 当前地址反查只需要 8 位精度，约为数百米范围。
 */
export function coordinatesToMaidenhead(
  latitude: number,
  longitude: number,
  length = 8
): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('纬度必须在 -90 到 90 之间')
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('经度必须在 -180 到 180 之间')
  }
  if (![4, 6, 8].includes(length)) {
    throw new Error('网格长度只支持 4、6 或 8 位')
  }

  // 180°/90° 位于编码范围的开区间上界，向内收敛避免索引越界。
  let lon = Math.min(longitude + 180, 360 - Number.EPSILON)
  let lat = Math.min(latitude + 90, 180 - Number.EPSILON)

  let grid = ''
  grid += String.fromCharCode(65 + Math.floor(lon / 20))
  grid += String.fromCharCode(65 + Math.floor(lat / 10))
  lon %= 20
  lat %= 10

  grid += String(Math.floor(lon / 2))
  grid += String(Math.floor(lat))
  if (length === 4) return grid
  lon %= 2
  lat %= 1

  grid += String.fromCharCode(65 + Math.floor(lon / (2 / 24)))
  grid += String.fromCharCode(65 + Math.floor(lat / (1 / 24)))
  if (length === 6) return grid
  lon %= 2 / 24
  lat %= 1 / 24

  grid += String(Math.floor(lon / (2 / 240)))
  grid += String(Math.floor(lat / (1 / 240)))
  return grid
}
