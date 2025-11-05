<script lang="ts">
	import CameraIcon from '$lib/icons/outline/cameraIcon.svelte';
	import CheckCircleIcon from '$lib/icons/outline/checkCircleIcon.svelte';
	import Loader2Icon from '$lib/icons/outline/loader2Icon.svelte';
	import ScanIcon from '$lib/icons/outline/scanIcon.svelte';
	import AlertCircleIcon from '$lib/icons/solid/alertCircleIcon.svelte';
	import { onMount, onDestroy } from 'svelte';
	import jsQR from 'jsqr';

	type TicketResponse = {
		status: 'success' | 'error';
		message: string;
		error_code?: 'ALREADY_SCANNED' | 'NOT_FOUND';
		ticket_data?: {
			user_name?: string;
			user_id?: string;
			scanned_at?: string;
		};
	}; // URL del endpoint (reemplaza con tu URL real)

	// --- CAMBIO 1: URL DEL ENDPOINT ACTUALIZADA ---
	const ENDPOINT_URL = 'https://validador-qr-bvw0.onrender.com/validate-ticket'; // --- CAMBIO 2: FUNCIÓN 'validateTicket' IMPLEMENTADA ---
	// Función para validar entrada con el endpoint real

	async function validateTicket(qrData: string): Promise<TicketResponse> {
		try {
			// Llamamos al endpoint real con el método POST
			const response = await fetch(ENDPOINT_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ f1_code: qrData }) // Enviamos el JSON como espera tu API
			}); // Tu API devuelve JSON tanto para éxito (200) como para errores (404, 409)
			// así que solo necesitamos parsear la respuesta.

			const data: TicketResponse = await response.json();
			return data;
		} catch (err) {
			// Esto captura errores de red (ej. sin internet, CORS, o si el servidor está caído)
			console.error('Error de red o fetch:', err);
			return {
				status: 'error',
				message: 'Error de conexión. No se pudo validar.'
			};
		}
	}

	// Variables reactivas
	let scanning = false;
	let result: TicketResponse | null = null;
	let loading = false;
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let scanInterval: ReturnType<typeof setInterval> | null = null;
	let cameraPermissionGranted = false;
	let cameraPermissionDenied = false;
	let lastScannedCode = ''; // Evitar escaneos duplicados

	// Verificar si hay permiso de cámara
	async function checkCameraPermission() {
		try {
			const permissionStatus = await navigator.permissions.query({
				name: 'camera' as PermissionName
			});

			if (permissionStatus.state === 'granted') {
				cameraPermissionGranted = true;
				cameraPermissionDenied = false;
			} else if (permissionStatus.state === 'denied') {
				cameraPermissionGranted = false;
				cameraPermissionDenied = true;
			}

			permissionStatus.onchange = () => {
				cameraPermissionGranted = permissionStatus.state === 'granted';
				cameraPermissionDenied = permissionStatus.state === 'denied';
			};
		} catch (err) {
			console.warn('⚠️ API de permisos no soportada');
		}
	}

	// Iniciar cámara
	async function startCamera() {
		scanning = true;
		result = null;
		lastScannedCode = '';

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1280 },
					height: { ideal: 720 }
				},
				audio: false
			});

			// Esperar un tick para que el elemento video exista en el DOM
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (videoElement) {
				videoElement.srcObject = stream;
				videoElement.setAttribute('playsinline', 'true');
				videoElement.setAttribute('autoplay', 'true');
				videoElement.setAttribute('muted', 'true');

				try {
					await videoElement.play();
					console.log('✅ Video reproduciendo');
				} catch (playError) {
					console.error('Error al reproducir video:', playError);
				}

				cameraPermissionGranted = true;
				cameraPermissionDenied = false;

				// Esperar a que el video esté completamente listo
				videoElement.onloadedmetadata = () => {
					console.log(
						'✅ Video metadata cargado. Dimensiones:',
						videoElement.videoWidth,
						'x',
						videoElement.videoHeight
					);
				};

				videoElement.oncanplay = () => {
					console.log('✅ Video puede reproducirse, iniciando escaneo...');
					startScanning();
				};
			} else {
				console.error('❌ Elemento video no encontrado');
			}
		} catch (err) {
			console.error('❌ Error al acceder a la cámara:', err);
			cameraPermissionDenied = true;
			scanning = false;
			alert(
				'No se pudo acceder a la cámara. Por favor, permite el acceso en la configuración del navegador.'
			);
		}
	}

	// Detener cámara
	function stopCamera() {
		scanning = false; // Primero detener el flag de escaneo

		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		if (scanInterval) {
			clearInterval(scanInterval);
			scanInterval = null;
		}
		if (videoElement) {
			videoElement.srcObject = null;
		}
		lastScannedCode = '';
	}

	// Escanear QR con jsQR
	function startScanning() {
		if (scanInterval) clearInterval(scanInterval);

		const scan = () => {
			if (
				canvasElement &&
				videoElement &&
				videoElement.readyState === videoElement.HAVE_ENOUGH_DATA
			) {
				const context = canvasElement.getContext('2d');
				if (!context) {
					requestAnimationFrame(scan);
					return;
				}

				// Asegurar que las dimensiones sean correctas
				if (
					canvasElement.width !== videoElement.videoWidth ||
					canvasElement.height !== videoElement.videoHeight
				) {
					canvasElement.width = videoElement.videoWidth;
					canvasElement.height = videoElement.videoHeight;
				}

				// Dibujar el frame actual del video en el canvas
				context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

				// Obtener los datos de la imagen
				const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

				// Intentar detectar código QR con diferentes opciones
				const code = jsQR(imageData.data, imageData.width, imageData.height, {
					inversionAttempts: 'attemptBoth' // Probar con imagen normal e invertida
				});

				if (code && code.data && code.data.trim() !== '' && code.data !== lastScannedCode) {
					console.log('✅ QR detectado:', code.data);
					lastScannedCode = code.data;
					handleQRDetected(code.data);
					return; // Detener el escaneo
				}
			}

			// Continuar escaneando
			if (scanning) {
				requestAnimationFrame(scan);
			}
		};

		// Iniciar el loop de escaneo
		requestAnimationFrame(scan);
	}

	// Manejar QR detectado
	async function handleQRDetected(qrData: string) {
		stopCamera();
		loading = true;
		result = null;

		try {
			const response = await validateTicket(qrData);
			result = response;
		} catch (err) {
			result = {
				status: 'error',
				error_code: 'NOT_FOUND',
				message: 'Error al validar entrada. Intenta nuevamente.'
			};
		} finally {
			loading = false;
		}
	}

	// Reset resultado
	function resetResult() {
		result = null;
		lastScannedCode = '';
	}

	// Formatear fecha
	function formatDate(dateString?: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleString('es-BO', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		checkCameraPermission();
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<div
	class="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white"
>
	<!-- Header -->
	<div class="border-b border-yellow-400/20 bg-black/50 p-4 backdrop-blur-sm md:p-6">
		<div class="mx-auto max-w-4xl">
			<h1
				class="glow-text mb-2 text-center text-4xl font-black tracking-wider text-[#F5FC3C] md:text-5xl"
				style="text-shadow: 0 0 20px rgba(245, 252, 60, 0.5);"
			>
				GÁRGOLA
			</h1>
			<p class="text-center text-sm font-medium tracking-wide text-gray-300 md:text-base">
				REGGAETON VIEJA ESCUELA
			</p>
			<div class="mt-2 flex items-center justify-center gap-2">
				<div class="h-0.5 w-12 bg-[#F5FC3C]"></div>
				<p class="text-lg font-bold text-[#F5FC3C]">8 NOV.</p>
				<div class="h-0.5 w-12 bg-[#F5FC3C]"></div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto p-4 md:p-6">
		<div class="mx-auto max-w-2xl">
			<!-- Scanner Section -->
			<div
				class="mb-6 rounded-2xl border-2 border-yellow-400/30 bg-gray-900/50 p-6 shadow-2xl backdrop-blur-sm"
			>
				<h2 class="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-[#F5FC3C]">
					<ScanIcon />
					Validador de Entradas
				</h2>

				<!-- Estado inicial: Sin cámara activa -->
				{#if !scanning && !result && !loading}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-[#F5FC3C]/50 bg-yellow-400/5 transition-all hover:bg-yellow-400/10"
						>
							<CameraIcon class="h-20 w-20 text-[#F5FC3C]" />
						</div>

						{#if cameraPermissionDenied}
							<div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
								<p class="text-sm text-red-400">
									⚠️ No tienes permisos para usar la cámara. Por favor, actívalos en la
									configuración del navegador.
								</p>
							</div>
						{/if}

						<button
							on:click={startCamera}
							class="transform rounded-xl bg-[#F5FC3C] px-8 py-4 font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-yellow-300 active:scale-95"
						>
							<span class="flex items-center justify-center gap-2">
								<ScanIcon class="h-5 w-5" />
								Iniciar Escaneo QR
							</span>
						</button>

						<p class="mt-4 text-sm text-gray-400">Apunta la cámara al código QR de la entrada</p>
					</div>
				{/if}

				<!-- Cámara activa escaneando -->
				{#if scanning}
					<div class="relative overflow-hidden rounded-xl bg-black">
						<video
							bind:this={videoElement}
							autoplay
							playsinline
							muted
							class="max-h-[600px] min-h-[300px] w-full object-cover"
						></video>
						<canvas bind:this={canvasElement} style="display: none;"></canvas>

						<!-- Overlay de escaneo -->
						<div class="pointer-events-none absolute inset-0 rounded-xl">
							<!-- Esquinas del marco de escaneo -->
							<div
								class="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 transform"
							>
								<!-- Esquina superior izquierda -->
								<div
									class="absolute top-0 left-0 h-12 w-12 rounded-tl-lg border-t-4 border-l-4 border-[#F5FC3C]"
								></div>
								<!-- Esquina superior derecha -->
								<div
									class="absolute top-0 right-0 h-12 w-12 rounded-tr-lg border-t-4 border-r-4 border-[#F5FC3C]"
								></div>
								<!-- Esquina inferior izquierda -->
								<div
									class="absolute bottom-0 left-0 h-12 w-12 rounded-bl-lg border-b-4 border-l-4 border-[#F5FC3C]"
								></div>
								<!-- Esquina inferior derecha -->
								<div
									class="absolute right-0 bottom-0 h-12 w-12 rounded-br-lg border-r-4 border-b-4 border-[#F5FC3C]"
								></div>

								<!-- Línea de escaneo animada -->
								<div class="animate-scan absolute inset-x-0 top-0 h-1 bg-[#F5FC3C] shadow-lg"></div>
							</div>
						</div>

						<!-- Indicador de escaneo -->
						<div class="absolute top-4 left-1/2 -translate-x-1/2 transform">
							<div
								class="rounded-full border border-[#F5FC3C]/30 bg-black/80 px-4 py-2 backdrop-blur-sm"
							>
								<p class="flex items-center gap-2 text-sm font-medium text-[#F5FC3C]">
									<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-[#F5FC3C]"></span>
									Buscando código QR...
								</p>
							</div>
						</div>

						<button
							on:click={stopCamera}
							class="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-xl bg-red-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
						>
							Cancelar
						</button>
					</div>
				{/if}

				<!-- Loading -->
				{#if loading}
					<div class="py-12 text-center">
						<div class="mx-auto mb-4 h-16 w-16 animate-spin">
							<Loader2Icon class="h-full w-full text-[#F5FC3C]" />
						</div>
						<p class="text-lg font-medium text-gray-300">Validando entrada...</p>
						<p class="mt-2 text-sm text-gray-500">Por favor espera</p>
					</div>
				{/if}

				<!-- Resultado -->
				{#if result}
					<div
						class="rounded-xl border-2 p-8 text-center transition-all {result.status === 'success'
							? 'border-green-500 bg-green-500/10'
							: 'border-red-500 bg-red-500/10'}"
					>
						<div class="mb-4 flex justify-center">
							{#if result.status === 'success'}
								<div class="rounded-full bg-green-500/20 p-4">
									<CheckCircleIcon class="h-16 w-16 text-green-400" />
								</div>
							{:else}
								<div class="rounded-full bg-red-500/20 p-4">
									<AlertCircleIcon class="h-16 w-16 text-red-400" />
								</div>
							{/if}
						</div>

						<h3
							class="mb-3 text-2xl font-bold {result.status === 'success'
								? 'text-green-400'
								: 'text-red-400'}"
						>
							{result.message}
						</h3>

						{#if result.ticket_data}
							<div class="mt-4 space-y-2 rounded-lg bg-black/30 p-4">
								{#if result.ticket_data.user_name}
									<p class="text-gray-300">
										<span class="text-gray-500">Usuario:</span>
										<span class="ml-2 font-bold text-white">{result.ticket_data.user_name}</span>
									</p>
								{/if}

								{#if result.ticket_data.user_id}
									<p class="text-gray-300">
										<span class="text-gray-500">Tipo:</span>
										<span class="ml-2 font-bold text-[#F5FC3C]">{result.ticket_data.user_id}</span>
									</p>
								{/if}

								{#if result.ticket_data.scanned_at}
									<p class="text-gray-300">
										<span class="text-gray-500">
											{result.status === 'success' ? 'Registrado:' : 'Primer escaneo:'}
										</span>
										<span class="ml-2 font-mono text-sm text-white"
											>{formatDate(result.ticket_data.scanned_at)}</span
										>
									</p>
								{/if}
							</div>
						{/if}

						{#if result.error_code}
							<div class="mt-3 text-sm text-gray-400">
								Código: {result.error_code}
							</div>
						{/if}

						<button
							on:click={resetResult}
							class="mt-6 transform rounded-xl bg-[#F5FC3C] px-8 py-3 font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-yellow-300 active:scale-95"
						>
							Escanear Otra Entrada
						</button>
					</div>
				{/if}
			</div>

			<!-- Instrucciones -->
			<div class="rounded-xl border border-yellow-400/20 bg-gray-900/30 p-4">
				<h3 class="mb-3 flex items-center gap-2 font-bold text-[#F5FC3C]">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					Instrucciones
				</h3>
				<ul class="space-y-2 text-sm text-gray-400">
					<li class="flex items-start gap-2">
						<span class="mt-0.5 text-[#F5FC3C]">•</span>
						<span>Presiona "Iniciar Escaneo QR" para activar la cámara</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 text-[#F5FC3C]">•</span>
						<span>Apunta la cámara al código QR de la entrada</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 text-[#F5FC3C]">•</span>
						<span>El escaneo es automático, no necesitas tomar foto</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 text-[#F5FC3C]">•</span>
						<span>La cámara se apagará automáticamente después de validar</span>
					</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<!-- <script lang="ts">
	import CameraIcon from '$lib/icons/outline/cameraIcon.svelte';
	import CheckCircleIcon from '$lib/icons/outline/checkCircleIcon.svelte';
	import Loader2Icon from '$lib/icons/outline/loader2Icon.svelte';
	import ScanIcon from '$lib/icons/outline/scanIcon.svelte';
	import AlertCircleIcon from '$lib/icons/solid/alertCircleIcon.svelte';
	import { onMount, onDestroy } from 'svelte';

	type ValidationResult = {
		valid: boolean;
		message: string;
		ticketNumber: string;
	};

	// Servicio simulado para validar entradas
	async function validateTicket(ticketNumber: string): Promise<ValidationResult> {
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const validTickets = ['12345', '67890', '11111', '22222', '33333'];
		const processedTickets = ['99999', '88888', '77777'];

		if (processedTickets.includes(ticketNumber)) {
			return { valid: false, message: 'Entrada ya procesada', ticketNumber };
		}

		if (validTickets.includes(ticketNumber)) {
			return { valid: true, message: 'Entrada válida - Acceso permitido', ticketNumber };
		}

		return { valid: false, message: 'Entrada no encontrada', ticketNumber };
	}

	// Variables reactivas
	let scanning = false;
	let result: ValidationResult | null = null;
	let loading = false;
	let manualInput = '';
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let scanInterval: ReturnType<typeof setInterval> | null = null;

	// --------------------------
	// 📸 Función original de cámara
	// --------------------------
	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});

			if (videoElement) {
				videoElement.srcObject = stream;
				scanning = true;
				result = null;
				startScanning();
			}
		} catch (err) {
			console.log(err);
			alert('No se pudo acceder a la cámara. Por favor, permite el acceso o usa entrada manual.');
		}
	}

	// --------------------------
	// 🛑 Detener cámara
	// --------------------------
	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		if (scanInterval) {
			clearInterval(scanInterval);
			scanInterval = null;
		}
		scanning = false;
	}

	// --------------------------
	// 🔍 Iniciar escaneo
	// --------------------------
	function startScanning() {
		scanInterval = setInterval(() => {
			if (canvasElement && videoElement) {
				const context = canvasElement.getContext('2d');

				if (context && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
					canvasElement.width = videoElement.videoWidth;
					canvasElement.height = videoElement.videoHeight;
					context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
					// Aquí iría la lógica de detección QR (jsQR, html5-qrcode, etc.)
				}
			}
		}, 100);
	}

	// --------------------------
	// ✋ Validación manual
	// --------------------------
	async function handleManualValidation() {
		if (!manualInput.trim()) return;

		loading = true;
		result = null;

		try {
			const response = await validateTicket(manualInput.trim());
			result = response;
			manualInput = '';
		} catch (err) {
			result = { valid: false, message: 'Error al validar entrada', ticketNumber: manualInput };
		} finally {
			loading = false;
		}
	}

	// --------------------------
	// 🧾 Simular escaneo QR
	// --------------------------
	async function simulateQRScan(ticketNumber: string) {
		stopCamera();
		loading = true;
		result = null;

		try {
			const response = await validateTicket(ticketNumber);
			result = response;
		} catch (err) {
			result = { valid: false, message: 'Error al validar entrada', ticketNumber };
		} finally {
			loading = false;
		}
	}

	// --------------------------
	// 🔁 Reset resultado
	// --------------------------
	function resetResult() {
		result = null;
		manualInput = '';
	}

	// --------------------------
	// ⌨️ Enter = validar
	// --------------------------
	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleManualValidation();
		}
	}

	// --------------------------
	// 🔐 Solicitar permiso de cámara automáticamente
	// --------------------------
	async function requestCameraPermission() {
		try {
			// Consulta el estado del permiso
			const permissionStatus = await navigator.permissions.query({
				name: 'camera' as PermissionName
			});

			if (permissionStatus.state === 'granted') {
				console.log('✅ Permiso ya otorgado');
				await startCamera();
			} else if (permissionStatus.state === 'prompt') {
				console.log('⚠️ Solicitando permiso al usuario...');
				await startCamera(); // Esto mostrará el cuadro de permiso del navegador
			} else if (permissionStatus.state === 'denied') {
				alert(
					'🚫 No tienes permisos para usar la cámara. Actívalos manualmente en la configuración del navegador.'
				);
			}

			// Si el permiso cambia (por ejemplo, usuario lo da después)
			permissionStatus.onchange = () => {
				if (permissionStatus.state === 'granted') {
					startCamera();
				}
			};
		} catch (err) {
			// Safari / iOS no soporta permissions.query
			console.warn('⚠️ API de permisos no soportada, usando fallback...');
			await startCamera();
		}
	}

	onMount(() => {
		requestCameraPermission();
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<div
	class="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white"
>
	<div class="border-b border-yellow-400/20 bg-black/50 p-4 backdrop-blur-sm md:p-6">
		<div class="mx-auto max-w-4xl">
			<h1
				class="glow-text mb-2 text-center text-4xl font-black tracking-wider text-[#F5FC3C] md:text-5xl"
			>
				GÁRGOLA
			</h1>
			<p class="text-center text-sm font-medium tracking-wide text-gray-300 md:text-base">
				REGGAETON VIEJA ESCUELA
			</p>
			<div class="mt-2 flex items-center justify-center gap-2">
				<div class="h-0.5 w-12 bg-[#F5FC3C]"></div>
				<p class="text-lg font-bold text-[#F5FC3C]">8 NOV.</p>
				<div class="h-0.5 w-12 bg-[#F5FC3C]"></div>
			</div>
		</div>
	</div>
	<div class="flex-1 overflow-y-auto p-4 md:p-6">
		<div class="mx-auto max-w-2xl">
			<div
				class="mb-6 flex flex-col justify-center rounded-2xl border-2 border-yellow-400/30 bg-gray-900/50 p-6 shadow-2xl backdrop-blur-sm"
			>
				<h2 class="mx-auto mb-4 flex items-center gap-2 text-2xl font-bold text-[#F5FC3C]">
					<ScanIcon />
					Escanear QR
				</h2>

				{#if !scanning && !result && !loading}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-[#F5FC3C]/50 bg-yellow-400/10"
						>
							<CameraIcon class="text-[#F5FC3C]" />
						</div>
						<button
							on:click={startCamera}
							class="transform rounded-xl bg-[#F5FC3C] px-8 py-4 font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-yellow-300"
						>
							Iniciar Cámara
						</button>
					</div>
				{/if}

				{#if scanning}
					<div class="relative">
						<video bind:this={videoElement} autoplay playsinline class="w-full rounded-xl bg-black"
						></video>
						<canvas bind:this={canvasElement} class="hidden"></canvas>
						<div
							class="pointer-events-none absolute inset-0 rounded-xl border-4 border-yellow-400/50"
						>
							<div
								class="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-xl border-4 border-yellow-400"
							></div>
						</div>
						<button
							on:click={stopCamera}
							class="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-red-600"
						>
							Cancelar
						</button>
					</div>
				{/if}

				{#if loading}
					<div class="py-12 text-center">
						<Loader2Icon class="text-yello-800" />
						<p class="text-lg text-gray-300">Validando entrada...</p>
					</div>
				{/if}

				{#if result}
					<div
						class="rounded-xl border-2 py-8 text-center {result.valid
							? 'border-green-500 bg-green-500/10'
							: 'border-red-500 bg-red-500/10'}"
					>
						{#if result.valid}
							<CheckCircleIcon class="text-green-500" />
						{:else}
							<AlertCircleIcon class="text-red-500" />
						{/if}
						<h3 class="mb-2 text-2xl font-bold {result.valid ? 'text-green-400' : 'text-red-400'}">
							{result.message}
						</h3>
						<p class="mb-1 text-gray-300">
							Entrada: <span class="font-mono font-bold">{result.ticketNumber}</span>
						</p>
						<button
							on:click={resetResult}
							class="mt-6 transform rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black transition hover:scale-105 hover:bg-yellow-300"
						>
							Escanear Otra
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>


este es mi app de lector de qr y extraer su data y enviarle a un enpoint, 
ese enpoint me devuelve estas respuestas lo cual quiero que adaptes mi app:
1. Respuesta de ÉxITO (Entrada Válida)
Código HTTP: 200 OK Cuerpo de la respuesta (JSON):
{
  "status": "success",
  "message": "Acceso permitido",
  "ticket_data": {
    "user_name": "Ana García",
    "user_id": "General",
    "scanned_at": "2025-11-05T10:51:00Z"
  }
}

 2. Error: Entrada YA REGISTRADA
Código HTTP: 409 Conflict Cuerpo de la respuesta (JSON):
{
  "status": "error",
  "error_code": "ALREADY_SCANNED",
  "message": "Esta entrada ya fue registrada.",
  "ticket_data": {
    "user_name": "Ana García",
    "scanned_at": "2025-11-05T09:15:30Z" // Opcional: mostrar cuándo fue el primer escaneo
  }
}

 3. Error: Entrada NO EXISTE
Código HTTP: 404 Not Found Cuerpo de la respuesta (JSON):
{
  "status": "error",
  "error_code": "NOT_FOUND",
  "message": "Código QR no válido. La entrada no existe."
}
 tambien mejora la parte de inicio de la camara en la app, al inicio de la app debe mostrar al usuario para dar permiso de usar la camara,
 pero no debe estqar encendida la camara siempre, la camara solo debe encenderse cuando le de click en iniciar scaneo de qr,
 y si scanea con exito que la camara se apague, en si en cualquier respuesta del enpoint debe debe apagarse la camara(ahi corregime si esta bien esa parte de la camara para la experiencia de usaurio).
 por el momento no funciona el lector de codigo qr, lo cual quiero que hagas que funcione el lector de qr para extraer su data yenviarle a mi enpoint,
 puedes usar una libreria para el lector si es necesario.
 mejorar la ux/ui, pero la ui no cambies la paleta de colores.
 el enpoint solo simula por el momento esas respuestas -->

<style>
	@keyframes scan {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(14rem);
		}
	}

	.animate-scan {
		animation: scan 2s ease-in-out infinite;
	}
</style>
