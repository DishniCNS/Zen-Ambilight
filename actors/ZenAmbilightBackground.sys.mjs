// Privileged Sine background module. Importing the registration module installs the
// Window Actor once for the browser process. Do not unregister it when an individual
// browser window closes: the actor is process-wide and other Zen windows may still use it.
import "./ZenAmbilightActorRegistration.sys.mjs";
