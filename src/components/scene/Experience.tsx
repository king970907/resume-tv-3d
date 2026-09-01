import { OrbitControls } from '@react-three/drei'
import { RetroTV } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'

export function Experience() {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      {/* 整體墊底亮度——墊高最低亮度，陰影死角才不會死黑一片 */}
      <ambientLight intensity={0.7} />

      {/* 主光源——從上方偏前打下來，唯一負責投影的光 */}
      <directionalLight position={[0.6, 1.2, 0.8]} intensity={1.2} castShadow />

      {/* 補光——低角度、從前方打過來，專門補到 DVD player 的正面，
          因為它疊在 TV 下層，正好被主光源的影子擋住 */}
      <directionalLight position={[0, 0.35, 1.2]} intensity={0.5} />

      {/* 點綴——這個版本的 three.js 點光源用的是 candela 單位，數字要開得
          比方向光/環境光大很多才看得出來 */}
      <pointLight position={[-0.6, 0.5, -0.4]} intensity={4} color="#39ff14" />

      <DVDPlayer />
      <RetroTV />
      <DVDCase />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* makeDefault 會把這個實例登記到 R3F 的 store 上（useThree 的
          state.controls），這樣場景樹裡其他元件（TV 旋鈕）的拖曳 handler
          才能拿到同一個實例去切換它的開關——之所以需要這樣做，是因為
          OrbitControls 直接掛在 canvas DOM 元素上監聽，在 R3F 自己的事件
          系統之外，某個 mesh 的 pointer event 喊 stopPropagation 攔不住它
          同時對同一次拖曳做出反應。 */}
      <OrbitControls
        makeDefault
        enablePan={false}
        target={CAMERA_TARGET}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
