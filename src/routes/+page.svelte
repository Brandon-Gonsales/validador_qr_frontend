<!-- <script lang="ts">
	import CameraIcon from '$lib/icons/outline/cameraIcon.svelte';
	import CheckCircleIcon from '$lib/icons/outline/checkCircleIcon.svelte';
	import Loader2Icon from '$lib/icons/outline/loader2Icon.svelte';
	import ScanIcon from '$lib/icons/outline/scanIcon.svelte';
	import AlertCircleIcon from '$lib/icons/solid/alertCircleIcon.svelte';
	import { onDestroy } from 'svelte';
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

	// Iniciar cámara
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

	// Detener cámara
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

	// Iniciar escaneo
	function startScanning() {
		scanInterval = setInterval(() => {
			if (canvasElement && videoElement) {
				const context = canvasElement.getContext('2d');

				if (context && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
					canvasElement.width = videoElement.videoWidth;
					canvasElement.height = videoElement.videoHeight;
					context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
					// Aquí iría la lógica de detección QR con jsQR o html5-qrcode
				}
			}
		}, 100);
	}

	// Validación manual
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

	// Simular escaneo QR
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

	// Resetear resultado
	function resetResult() {
		result = null;
		manualInput = '';
	}

	// Manejar tecla Enter
	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleManualValidation();
		}
	}

	// Cleanup al destruir componente
	onDestroy(() => {
		stopCamera();
	});
</script> -->

<script lang="ts">
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

	// --------------------------
	// 🔁 Montaje y limpieza
	// --------------------------
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
	<!-- Header -->
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

	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto p-4 md:p-6">
		<div class="mx-auto max-w-2xl">
			<!-- Scanner Section -->
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

						<!-- <div class="mt-8 border-t border-gray-700 pt-6">
							<p class="mb-3 text-sm text-gray-400">Demo - Simular escaneo:</p>
							<div class="flex flex-wrap justify-center gap-2">
								<button
									on:click={() => simulateQRScan('12345')}
									class="rounded-lg border border-green-500 bg-green-900/30 px-4 py-2 text-sm text-green-400 transition hover:bg-green-900/50"
								>
									QR Válido (12345)
								</button>
								<button
									on:click={() => simulateQRScan('99999')}
									class="rounded-lg border border-orange-500 bg-orange-900/30 px-4 py-2 text-sm text-orange-400 transition hover:bg-orange-900/50"
								>
									QR Procesado (99999)
								</button>
								<button
									on:click={() => simulateQRScan('00000')}
									class="rounded-lg border border-red-500 bg-red-900/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-900/50"
								>
									QR Inválido (00000)
								</button>
							</div>
						</div> -->
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

			<!-- Manual Input Section -->
			<!-- {#if !scanning && !loading}
				<div
					class="rounded-2xl border-2 border-gray-700 bg-gray-900/50 p-6 shadow-2xl backdrop-blur-sm"
				>
					<h2 class="mb-4 flex items-center gap-2 text-xl font-bold text-gray-300">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-5 w-5"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						Entrada Manual
					</h2>
					<div class="space-y-4">
						<input
							type="text"
							bind:value={manualInput}
							on:keypress={handleKeyPress}
							placeholder="Ingresa el número de entrada"
							class="w-full rounded-xl border-2 border-gray-700 bg-black/50 px-4 py-3 text-white placeholder-gray-500 transition focus:border-yellow-400 focus:outline-none"
						/>
						<button
							on:click={handleManualValidation}
							disabled={!manualInput.trim()}
							class="w-full rounded-xl bg-gray-700 px-6 py-3 font-bold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Validar Entrada
						</button>
					</div>
					<p class="mt-3 text-center text-xs text-gray-500">
						Usa este método si no puedes escanear el código QR
					</p>
				</div>
			{/if} -->
		</div>
	</div>
</div>
