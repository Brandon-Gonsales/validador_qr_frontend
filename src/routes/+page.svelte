<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Html5Qrcode } from 'html5-qrcode';
	import CheckCircleIcon from '$lib/icons/outline/checkCircleIcon.svelte';
	import AlertCircleIcon from '$lib/icons/solid/alertCircleIcon.svelte';
	import CameraIcon from '$lib/icons/outline/cameraIcon.svelte';
	import Loader2Icon from '$lib/icons/outline/loader2Icon.svelte';

	type TicketResponse = {
		status: 'success' | 'error';
		message: string;
		error_code?: 'ALREADY_SCANNED' | 'NOT_FOUND';
		ticket_data?: {
			user_name?: string;
			user_id?: string;
			scanned_at?: string;
		};
	};

	const ENDPOINT_URL = 'https://validador-qr-bvw0.onrender.com/validate-ticket';
	let dataQR: string = $state('');

	async function validateTicket(qrData: string): Promise<TicketResponse> {
		//console.log('Validando entrada con código:', qrData);
		dataQR = qrData;
		try {
			const response = await fetch(ENDPOINT_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ f1_code: qrData })
			});

			const body = await response.json();

			if (response.status === 404) {
				return body.detail as TicketResponse;
			}

			if (response.status === 409) {
				return body.detail as TicketResponse;
			}
			return body as TicketResponse;
		} catch (err) {
			console.error('Error de red o fetch:', err);

			return {
				status: 'error',
				message: 'Error de conexión. No se pudo validar.'
			};
		}
	}

	// --- VARIABLES REACTIVAS ---

	let scanning: boolean = $state(false);
	let result: TicketResponse | null = $state(null);
	let loading: boolean = $state(false);
	let cameraPermissionDenied: boolean = $state(false);
	let lastScannedCode: string = $state(''); // Evitar escaneos duplicados
	let ticketData: any = $state(null);
	// Variable para la instancia de la librería
	// result = {
	// 	status: 'error',
	// 	message: 'Ticket válido',
	// 	error_code: 'ALREADY_SCANNED',
	// 	ticket_data: { user_name: 'Juan', user_id: '123', scanned_at: '2023-01-01T00:00:00' }
	// };

	let html5QrCode: Html5Qrcode; // ID del <div> donde se renderizará el video
	const qrReaderElementId = 'qr-reader'; // --- LÓGICA DEL ESCÁNER (Actualizada) ---

	async function startScanner() {
		scanning = true;
		result = null;
		lastScannedCode = '';
		dataQR = '';
		await new Promise((resolve) => setTimeout(resolve, 100)); // Inicializar la librería en el <div>

		if (!html5QrCode) {
			html5QrCode = new Html5Qrcode(qrReaderElementId);
		} // Configuración: 10 FPS, y un 'qrbox' de 224x224px
		// El 'qrbox' es el área visual donde la librería se enfocará en buscar

		const config = {
			fps: 10,
			qrbox: { width: 224, height: 224 }
		}; // Callback: Se llama CADA VEZ que detecta un QR

		const qrCodeSuccessCallback = (decodedText: string) => {
			// Solo procesar si es un código nuevo (para evitar doble submit)
			if (decodedText !== lastScannedCode) {
				lastScannedCode = decodedText;
				handleQRDetected(decodedText);
			}
		}; // Callback para errores (los ignoramos para que siga escaneando)

		const qrCodeErrorCallback = (errorMessage: string) => {
			// console.warn(`Error de escaneo: ${errorMessage}`);
		};

		try {
			// ¡Iniciar la cámara!
			await html5QrCode.start(
				{ facingMode: 'environment' }, // Pedir cámara trasera
				config,
				qrCodeSuccessCallback,
				qrCodeErrorCallback
			);
			console.log('✅ Escáner iniciado');
			cameraPermissionDenied = false;
		} catch (err: any) {
			// Manejar error de permisos
			console.error('❌ Error al iniciar el escáner:', err);
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				cameraPermissionDenied = true;
			}
			scanning = false;
			//alert(err);
			alert('No se pudo acceder a la cámara. Revisa los permisos.');
		}
	}

	async function stopScanner() {
		scanning = false;
		resetResult();
		try {
			// Detener la cámara solo si está iniciada
			if (html5QrCode && html5QrCode.isScanning) {
				await html5QrCode.stop();
				console.log('✅ Escáner detenido');
			}
		} catch (err) {
			console.error('❌ Error al detener el escáner:', err);
		}
		lastScannedCode = '';
	}

	async function handleQRDetected(qrData: string) {
		// Detener la cámara INMEDIATAMENTE
		await stopScanner(); // Mostrar 'Cargando...'
		loading = true;
		result = null; // Llamar a la API

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
	} // --- FUNCIONES AUXILIARES (Sin cambios) ---

	function resetResult() {
		result = null;
		lastScannedCode = '';
	}

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
	} // --- CICLO DE VIDA ---

	onMount(() => {
		// No inicializamos la cámara aquí, solo al presionar el botón
		// Pero verificamos permisos si es posible (opcional)
		if (navigator.permissions) {
			navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
				cameraPermissionDenied = status.state === 'denied';
				status.onchange = () => {
					cameraPermissionDenied = status.state === 'denied';
				};
			});
		}
	});

	onDestroy(() => {
		// Asegurarse de detener la cámara si el componente se destruye
		stopScanner();
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
				class="mb-6 rounded-2xl border-2 border-yellow-400/30 bg-gray-900/50 p-6 shadow-2xl backdrop-blur-sm"
			>
				<!-- Estado inicial: Sin cámara activa -->
				{#if !scanning && !result && !loading}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-[#F5FC3C]/50 bg-yellow-400/5 transition-all hover:bg-yellow-400/10"
						>
							<!-- Icono SVG en línea -->
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
							onclick={startScanner}
							class="transform rounded-xl bg-[#F5FC3C] px-8 py-4 font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-yellow-300 active:scale-95"
						>
							<span class="flex items-center justify-center gap-2">
								<CameraIcon class="h-5 w-5" />
								Iniciar Escaneo QR
							</span>
						</button>
					</div>
				{/if}

				<!-- Cámara activa escaneando -->
				{#if scanning}
					<div class="relative overflow-hidden rounded-xl bg-black">
						<div id="qr-reader" class="min-h-[300px] w-full"></div>
						<div class="pointer-events-none absolute inset-0 rounded-xl">
							<div
								class="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 transform"
							>
								<div
									class="absolute top-0 left-0 h-12 w-12 rounded-tl-lg border-t-4 border-l-4 border-[#F5FC3C]"
								></div>
								<div
									class="absolute top-0 right-0 h-12 w-12 rounded-tr-lg border-t-4 border-r-4 border-[#F5FC3C]"
								></div>
								<div
									class="absolute bottom-0 left-0 h-12 w-12 rounded-bl-lg border-b-4 border-l-4 border-[#F5FC3C]"
								></div>
								<div
									class="absolute right-0 bottom-0 h-12 w-12 rounded-br-lg border-r-4 border-b-4 border-[#F5FC3C]"
								></div>
								<div class="animate-scan absolute inset-x-0 top-0 h-1 bg-[#F5FC3C] shadow-lg"></div>
							</div>
						</div>

						<button
							onclick={stopScanner}
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
							<!-- Icono SVG en línea (animado con <style>) -->
							<Loader2Icon class="h-full w-full text-[#F5FC3C]" />
						</div>
						<p class="text-lg font-medium text-gray-300">Validando entrada...</p>
						<p class="mt-2 text-sm text-gray-500">Por favor espera</p>
					</div>
				{/if}

				<!-- Resultado -->
				{#if result}
					<div
						class="rounded-xl border-2 p-2 text-center transition-all {result.status === 'success'
							? 'border-green-500 bg-green-500/10'
							: 'border-red-500 bg-red-500/10'}"
					>
						<div class="mb-4 flex justify-center">
							{#if result.status === 'success'}
								<div class="rounded-full bg-green-500/20 p-2">
									<!-- Icono SVG en línea -->
									<CheckCircleIcon class="h-10 w-10 text-green-400" />
								</div>
							{:else}
								<div class="rounded-full bg-red-500/20 p-2">
									<!-- Icono SVG en línea -->
									<AlertCircleIcon class="h-10 w-10 text-red-400" />
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
									<p class="text-center text-gray-300">
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
							onclick={resetResult}
							class="mt-6 transform rounded-xl bg-[#F5FC3C] px-8 py-3 font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-yellow-300 active:scale-95"
						>
							Escanear Otra Entrada
						</button>
					</div>
				{/if}
			</div>
			<div class="text-center">
				{#if dataQR}
					<span class="text-2xl font-bold text-white">Datos QR: {dataQR}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	:global(.animate-scan) {
		animation: scan 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	@keyframes scan {
		0% {
			transform: translateY(0);
		}
		50% {
			/* 224px (altura del qrbox) - 4px (altura de la línea) */
			transform: translateY(220px);
		}
		100% {
			transform: translateY(0);
		}
	}

	:global(.glow-text) {
		text-shadow: 0 0 20px rgba(245, 252, 60, 0.5);
	}

	:global(#qr-reader video) {
		width: 100%;
		height: auto;
		object-fit: cover;
		min-height: 300px;
		max-height: 600px; /* Coincide con tu <video> anterior */
		border-radius: 0.75rem; /* 12px, coincide con el 'rounded-xl' */
	}
</style>
