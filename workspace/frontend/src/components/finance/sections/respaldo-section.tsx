"use client";
import {StateConsistencyBoundary} from "@/components/finance/states/async-state";
import {RespaldoSection as Legacy} from "./respaldo-section.legacy";
export function RespaldoSection(){return <StateConsistencyBoundary section="respaldo" label="Respaldo"><Legacy/></StateConsistencyBoundary>}
