import type { Ref } from 'vue'

export const CANVAS_WIDTH = 420  // A6 width (105mm at 4px/mm)
export const CANVAS_HEIGHT = 595 // A6 height (148mm at 4px/mm)

export function useFabricCanvas(
	canvasRef: Ref<HTMLCanvasElement | undefined>,
	textSync: {
		textColor: Ref<string>
		textFontFamily: Ref<string>
		textAlign: Ref<'left' | 'center' | 'right'>
	},
) {
	const canvas = shallowRef<any>(null)

	const initCanvas = async () => {
		if (!process.client || !canvasRef.value || canvas.value) return

		const fabric = await import('fabric')
		const { Canvas, Control, controlsUtils } = fabric

		canvas.value = new Canvas(canvasRef.value, {
			width: CANVAS_WIDTH,
			height: CANVAS_HEIGHT,
			backgroundColor: '#ffffff',
		})

		const syncTextProps = (e: any) => {
			const obj = e.selected?.[0] ?? e.target
			if (obj && obj.type === 'textbox') {
				if (obj.fill) textSync.textColor.value = obj.fill as string
				if (obj.fontFamily) textSync.textFontFamily.value = obj.fontFamily
				if (obj.textAlign) textSync.textAlign.value = obj.textAlign as 'left' | 'center' | 'right'
			}
		}
		canvas.value.on('selection:created', syncTextProps)
		canvas.value.on('selection:updated', syncTextProps)

		if (fabric.Object?.prototype) {
			try {
				fabric.Object.prototype.transparentCorners = false
				fabric.Object.prototype.cornerSize = 12
				fabric.Object.prototype.cornerColor = '#00E5FF'
				fabric.Object.prototype.cornerStrokeColor = '#ffffff'
				fabric.Object.prototype.borderColor = '#00E5FF'
				fabric.Object.prototype.cornerStyle = 'circle'
				fabric.Object.prototype.touchCornerSize = 20
				fabric.Object.prototype.borderScaleFactor = 2

				if (fabric.Object.prototype.controls && !fabric.Object.prototype.controls.mtr) {
					const utils = (controlsUtils as any) || (fabric as any)?.controlsUtils
					if (utils) {
						fabric.Object.prototype.controls.mtr = new Control({
							x: 0,
							y: -0.5,
							offsetY: -30,
							cursorStyle: 'crosshair',
							actionHandler: utils.rotationWithSnapping || utils.rotateObject,
							actionName: 'rotate',
							render: utils.renderCircleControl,
						})
					}
				}
			} catch (err) {
				console.warn('Error configuring Fabric controls:', err)
			}
		}
	}

	const configureObjectControls = (obj: any) => {
		obj.set({
			borderColor: '#00E5FF',
			cornerColor: '#ffffff',
			cornerStrokeColor: '#00E5FF',
			cornerStyle: 'circle',
			cornerSize: 10,
			transparentCorners: false,
			borderScaleFactor: 2,
			lockRotation: false,
			lockScalingX: false,
			lockScalingY: false,
			lockMovementX: false,
			lockMovementY: false,
			lockUniScaling: false,
			selectable: true,
			evented: true,
			hasControls: true,
			hasBorders: true,
			objectCaching: false,
		})
		obj.setControlsVisibility({
			mt: true, mb: true, ml: true, mr: true,
			bl: true, br: true, tl: true, tr: true, mtr: true,
		})
	}

	const loadFlyerImageAsBackground = async (flyerDesignUrl: string) => {
		if (!canvas.value) return
		try {
			const { FabricImage } = await import('fabric')
			const img = await FabricImage.fromURL(flyerDesignUrl, { crossOrigin: 'anonymous' })
			img.set({
				left: 0,
				top: 0,
				originX: 'left',
				originY: 'top',
				scaleX: CANVAS_WIDTH / (img.width || CANVAS_WIDTH),
				scaleY: CANVAS_HEIGHT / (img.height || CANVAS_HEIGHT),
				selectable: false,
				evented: false,
				lockMovementX: true,
				lockMovementY: true,
			})
			canvas.value.add(img)
			canvas.value.sendObjectToBack(img)
		} catch (e) {
			console.warn('Could not load flyer image as background:', e)
		}
	}

	onBeforeUnmount(() => {
		const toDispose = canvas.value
		canvas.value = null
		if (toDispose) toDispose.dispose().catch(() => {})
	})

	return { canvas, CANVAS_WIDTH, CANVAS_HEIGHT, initCanvas, configureObjectControls, loadFlyerImageAsBackground }
}
