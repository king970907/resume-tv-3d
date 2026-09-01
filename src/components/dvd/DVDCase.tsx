import {
  DVD_CASE_BASE_POSITION,
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_LEAN_ANGLE,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'

// 斜靠著某個東西的姿態，是「底部不動、頂部往靠著的表面倒」——像一本書靠在
// 牆上一樣。所以傾斜旋轉的軸心要放在盒子的底部邊緣，不是幾何中心（繞中心轉
// 的話，靠近的那個角會往 TV 裡甩進去，不是單純把頂部往外倒而已）。
//
// dvd-case-lean-pivot 放在底部、貼地的高度。裡面的 dvd-case group 再往上
// 位移半個盒子高度，讓盒子視覺上「站」在這個底部支點上——跟 tv-body／
// dvd-player-body 是同一招，只是這次的支點是有旋轉的，不是單純貼地而已。
export function DVDCase() {
  return (
    <group
      name="dvd-case-lean-pivot"
      position={DVD_CASE_BASE_POSITION}
      rotation={[0, 0, DVD_CASE_LEAN_ANGLE]}
    >
      <group name="dvd-case" position={[0, DVD_CASE_HEIGHT / 2, 0]}>
        <mesh name="dvd-case-back-cover" position={[0, 0, -DVD_CASE_DEPTH / 4]} castShadow receiveShadow>
          <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
          <meshStandardMaterial color="#3a3a4e" roughness={0.3} />
        </mesh>

        <group
          name="dvd-case-front-cover-pivot"
          position={[-DVD_CASE_WIDTH / 2, 0, DVD_CASE_DEPTH / 4]}
        >
          <mesh
            name="dvd-case-front-cover"
            position={[DVD_CASE_WIDTH / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
            <meshStandardMaterial color="#4a4a60" roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
