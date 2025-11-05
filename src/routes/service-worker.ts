// src/service-worker.ts

/**
 * ¡Directivas CLAVE!
 * Le dicen a TypeScript que este archivo se ejecuta en un entorno de Web Worker
 * y que debe cargar los tipos de SvelteKit.
 */
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

// Declara explícitamente 'self' con el tipo de Service Worker Global Scope
// Esto habilita el autocompletado para 'self', 'caches', 'fetch', etc.
declare let self: ServiceWorkerGlobalScope;

// Nombre único para el caché, basado en la 'version' generada por SvelteKit
const CACHE_NAME = `cache-${version}`;

// 'build' son los archivos de tu app (chunks de JS/CSS)
// 'files' son los archivos estáticos (de la carpeta /static)
const ASSETS_TO_CACHE: string[] = [...build, ...files];

/**
 * Evento 'install': Se dispara cuando el SW se instala por primera vez.
 * Aquí es donde guardamos todos nuestros assets en el caché.
 */
self.addEventListener('install', (event) => {
	// TypeScript infiere 'event' como 'ExtendableEvent' gracias a las directivas
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log('[Service Worker] Precargando caché');
				return cache.addAll(ASSETS_TO_CACHE);
			})
			.then(() => {
				// Fuerza al nuevo Service Worker a activarse de inmediato
				self.skipWaiting();
			})
	);
});

/**
 * Evento 'activate': Se dispara cuando el nuevo SW reemplaza al antiguo.
 * Aquí es donde limpiamos los cachés antiguos.
 */
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				// Borramos todos los cachés que no tengan el nombre del CACHE_NAME actual
				keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
			);
		})
	);
	// Le dice al SW que tome control de todas las pestañas abiertas inmediatamente
	self.clients.claim();
});

/**
 * Evento 'fetch': Se dispara por cada petición de red (imágenes, CSS, API, etc.).
 * Aquí implementamos nuestra estrategia de caché (Cache First).
 */
self.addEventListener('fetch', (event) => {
	// TypeScript infiere 'event' como 'FetchEvent'
	const { request } = event;

	// Ignorar peticiones que no sean GET (como POST, PUT, etc.)
	if (request.method !== 'GET') {
		return;
	}

	// Estrategia: Cache First (Primero busca en caché)
	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			// Si la respuesta está en el caché, la retornamos
			if (cachedResponse) {
				return cachedResponse;
			}

			// Si no está en caché, vamos a la red a buscarla
			return fetch(request).then((networkResponse) => {
				// (Opcional) Aquí podrías clonar y guardar la 'networkResponse' en caché
				// para futuras peticiones, pero este ejemplo básico solo
				// cachea los archivos iniciales.
				return networkResponse;
			});
		})
	);
});
