<script lang="ts">
	// --- LIBRERÍAS ---
	import { onMount, onDestroy } from 'svelte'; // Importamos la nueva librería. Debes instalarla: npm install html5-qrcode
	import { Html5Qrcode } from 'html5-qrcode'; // --- TIPOS DE DATOS (Sin cambios) ---

	type TicketResponse = {
		status: 'success' | 'error';
		message: string;
		error_code?: 'ALREADY_SCANNED' | 'NOT_FOUND';
		ticket_data?: {
			user_name?: string;
			user_id?: string;
			scanned_at?: string;
		};
	}; // --- ENDPOINT (Sin cambios) ---

	const ENDPOINT_URL = 'https://validador-qr-bvw0.onrender.com/validate-ticket'; // --- FUNCIÓN DE API (Sin cambios, está perfecta) ---

	async function validateTicket(qrData: string): Promise<TicketResponse> {
		console.log('Validando entrada con código:', qrData);

		try {
			const response = await fetch(ENDPOINT_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ f1_code: qrData })
			});
			console.log('response.json(): ', response.json());
			//ticketData = await response.json();
			const data: TicketResponse = await response.json();
			return data;
		} catch (err) {
			console.error('Error de red o fetch:', err);
			alert(err);
			ticketData = err;
			return {
				status: 'error',
				message: 'Error de conexión. No se pudo validar.'
			};
		}
	} // --- VARIABLES REACTIVAS ---

	let scanning: boolean = $state(false);
	let result: TicketResponse | null = $state(null);
	let loading: boolean = $state(false);
	let cameraPermissionDenied: boolean = $state(false);
	let lastScannedCode: string = $state(''); // Evitar escaneos duplicados
	let ticketData: any = $state(null);
	// Variable para la instancia de la librería

	let html5QrCode: Html5Qrcode; // ID del <div> donde se renderizará el video
	const qrReaderElementId = 'qr-reader'; // --- LÓGICA DEL ESCÁNER (Actualizada) ---

	async function startScanner() {
		scanning = true;
		result = null;
		lastScannedCode = ''; // Esperar un tick para que el <div id="qr-reader"> exista en el DOM

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
				console.log('✅ QR detectado:', decodedText);
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
			alert('No se pudo acceder a la cámara. Revisa los permisos.');
		}
	}

	async function stopScanner() {
		scanning = false;
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

<!-- 
  HTML (DISEÑO) 
  He reemplazado los <...Icon> por SVGs en línea
  y el <video>/<canvas> por el <div id="qr-reader">
-->
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
				<h2 class="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-[#F5FC3C]">
					<!-- Icono SVG en línea -->
					<svg
						class="h-6 w-6"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path
							d="M21 17v2a2 2 0 0 1-2 2h-2"
						></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect
							x="7"
							y="7"
							width="10"
							height="10"
							rx="1"
						></rect><line x1="7" y1="12" x2="17" y2="12"></line></svg
					>
					          Validador de Entradas
				</h2>

				<!-- Estado inicial: Sin cámara activa -->
				{#if !scanning && !result && !loading}
					<div class="py-8 text-center">
						<div
							class="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-[#F5FC3C]/50 bg-yellow-400/5 transition-all hover:bg-yellow-400/10"
						>
							<!-- Icono SVG en línea -->
							<svg
								class="h-20 w-20 text-[#F5FC3C]"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path
									d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
								></path><circle cx="12" cy="13" r="3"></circle></svg
							>
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
								<!-- Icono SVG en línea -->
								<svg
									class="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"
									></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path
										d="M7 21H5a2 2 0 0 1-2-2v-2"
									></path><rect x="7" y="7" width="10" height="10" rx="1"></rect><line
										x1="7"
										y1="12"
										x2="17"
										y2="12"
									></line></svg
								>
								                Iniciar Escaneo QR
							</span>
						</button>
						<p class="mt-4 text-sm text-gray-400">Apunta la cámara al código QR de la entrada</p>
					</div>
				{/if}

				<!-- Cámara activa escaneando -->
				{#if scanning}
					<div class="relative overflow-hidden rounded-xl bg-black">
						<!-- 
              --- ESTE ES EL CAMBIO PRINCIPAL ---
              La librería 'html5-qrcode' inyectará el video aquí dentro.
              ¡Esto mostrará la cámara en la pantalla!
            -->
						<div id="qr-reader" class="min-h-[300px] w-full"></div>

						<!-- Overlay de escaneo (Tu diseño original, ¡se ve genial!) -->
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

								<!-- Línea de escaneo animada (definida en <style>) -->
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
							<svg
								class="h-full w-full text-[#F5FC3C]"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"
								></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line
									x1="16.24"
									y1="16.24"
									x2="19.07"
									y2="19.07"
								></line><line x1="2" y1="12" x2="6" y2="12"></line><line
									x1="18"
									y1="12"
									x2="22"
									y2="12"
								></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line
									x1="16.24"
									y1="7.76"
									x2="19.07"
									y2="4.93"
								></line></svg
							>
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
									<!-- Icono SVG en línea -->
									<svg
										class="h-16 w-16 text-green-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline
											points="22 4 12 14.01 9 11.01"
										></polyline></svg
									>
								</div>
							{:else}
								<div class="rounded-full bg-red-500/20 p-4">
									<!-- Icono SVG en línea -->
									<svg
										class="h-16 w-16 text-red-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"
										></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg
									>
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
									section:
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
			<div class="rounded-xl border border-yellow-400/20 bg-gray-900/30 p-4">
				{#if ticketData}
					<h3>ticketData response</h3>
					<pre>{JSON.stringify(ticketData, null, 2)}</pre>
				{/if}
			</div>
			<button onclick={() => validateTicket('671939')}>Iniciar escaneo</button>
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

<!-- 
  ESTILOS GLOBALES
  He agregado esto para las animaciones y para asegurar que el video se vea bien.
-->
<!-- <style>
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
</style> -->

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
