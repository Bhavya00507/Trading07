# Quantum Terminal — Handoff Changelog & Version History

## Version 1.0.0-ACQUISITION — Official Handoff Release

### Features & Architecture
- **Buyer Presentation & Demo Mode**: Added header `● DEMO MODE` badge, Buyer Presentation Dashboard modal (12 modules), 8-step guided Product Tour, System Health Panel, About Panel, and safe Demo Reset trigger.
- **Quantum Mobile Pro Touch Gesture Fix**: Updated `handleScroll.vertTouchDrag: true` and `handleScale` axis configuration in `Chart.tsx`. Repositioned event strip lane to `bottom: 36px` and floating controls to `bottom: 38px`, resolving chart time-axis label clipping.
- **Quantum Menu Redesign**: Rebuilt mobile slide-out drawer into an institutional dark navigation panel (`QuantumMenu.tsx`).
- **Complete Software Acquisition Package**: Added 18 technical due-diligence documents inside `/acquisition/` covering IP audit, feature matrix, technical stack, security findings, performance benchmarks, and deployment guides.
- **Backend Test Suite**: Verified **155 passing unit and integration tests** (100% pass rate).
- **Vite Build System**: Verified Vite production bundle compiles static assets cleanly in 1.86s.
