import { useMemo, useRef, useState } from 'react';
import { findKing } from '../../engine/board';
import { initialBoard } from '../../engine/constants';
import type { Move } from '../../engine/types';
import { sideOfColor } from '../../game/rules';
import { useGameStore } from '../../game/store';
import { BoardGrid } from './BoardGrid';
import { Markers } from './Markers';
import { Piece } from './Piece';
import { useBoardGeometry } from './useBoardGeometry';
import styles from './Board.module.css';

interface PieceEl {
  id: number;
  piece: number;
  sq: number;
}

function buildPieces(moveList: Move[]): PieceEl[] {
  const board = initialBoard();
  const pieces: PieceEl[] = [];
  for (let i = 0; i < 90; i++) {
    if (board[i] !== 0) pieces.push({ id: i, piece: board[i], sq: i });
  }
  for (const mv of moveList) {
    const capturedIndex = pieces.findIndex((p) => p.sq === mv.to);
    if (capturedIndex >= 0) pieces.splice(capturedIndex, 1);
    const mover = pieces.find((p) => p.sq === mv.from);
    if (mover) {
      mover.sq = mv.to;
      mover.piece = mv.piece;
    }
  }
  return pieces;
}

interface PressState {
  from: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function Board() {
  const position = useGameStore((s) => s.position);
  const moveList = useGameStore((s) => s.moveList);
  const lastMove = useGameStore((s) => s.lastMove);
  const selectedSquare = useGameStore((s) => s.selectedSquare);
  const legalTargets = useGameStore((s) => s.legalTargets);
  const hint = useGameStore((s) => s.hint);
  const inCheck = useGameStore((s) => s.inCheck);
  const status = useGameStore((s) => s.status);
  const playerColor = useGameStore((s) => s.playerColor);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const gameId = useGameStore((s) => s.gameId);

  const { ref, cell, pad, width, height, ready } = useBoardGeometry();
  const pieces = useMemo(() => buildPieces(moveList), [moveList, gameId]);

  const [press, setPress] = useState<PressState | null>(null);
  const [drag, setDrag] = useState<{ from: number; x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const px = (col: number) => pad + col * cell;
  const py = (row: number) => pad + row * cell;

  const squareFromEvent = (clientX: number, clientY: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.round((clientX - rect.left - pad) / cell);
    const row = Math.round((clientY - rect.top - pad) / cell);
    if (col < 0 || col > 8 || row < 0 || row > 9) return null;
    const dx = clientX - rect.left - px(col);
    const dy = clientY - rect.top - py(row);
    if (Math.abs(dx) > 0.78 * cell || Math.abs(dy) > 0.78 * cell) return null;
    return row * 9 + col;
  };

  const canPlay = status === 'playing' && position.turn === playerColor;

  const onPointerDown = (e: React.PointerEvent) => {
    const sq = squareFromEvent(e.clientX, e.clientY);
    if (sq === null) {
      setPress(null);
      return;
    }
    const piece = position.board[sq];
    const own = piece !== 0 && (piece > 0 ? 'red' : 'black') === playerColor;
    if (canPlay && own) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setPress({ from: sq, startX: e.clientX, startY: e.clientY, moved: false });
      return;
    }
    setPress(null);
    if (status === 'playing') selectSquare(sq);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!press) return;
    const dist = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!press.moved && dist > 6) {
      selectSquare(press.from);
      setPress({ ...press, moved: true });
      setDrag({ from: press.from, x, y });
    } else if (press.moved) {
      setDrag({ from: press.from, x, y });
    }
  };

  const endPress = (e: React.PointerEvent, cancelled: boolean) => {
    if (!press) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (press.moved && !cancelled) {
      const sq = squareFromEvent(e.clientX, e.clientY);
      if (sq !== null && sq !== press.from) {
        selectSquare(sq);
      } else if (sq === null || sq === press.from) {
        selectSquare(press.from);
      }
    } else if (!press.moved && !cancelled) {
      selectSquare(press.from);
    }
    setPress(null);
    setDrag(null);
  };

  const checkSquare = inCheck
    ? findKing(position.board, sideOfColor(position.turn))
    : null;

  return (
    <div className={styles.area} ref={ref}>
      {ready && (
        <div
          ref={boardRef}
          className={styles.board}
          style={{ width, height, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPress(e, false)}
          onPointerCancel={(e) => endPress(e, true)}
        >
          <div className={styles.surface} />
          <BoardGrid cell={cell} pad={pad} width={width} height={height} />
          <Markers
            cell={cell}
            pad={pad}
            width={width}
            height={height}
            board={position.board}
            lastMove={lastMove}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            hint={hint}
            checkSquare={checkSquare}
          />
          {pieces.map((p) => {
            const col = p.sq % 9;
            const row = (p.sq / 9) | 0;
            const isDragging = drag !== null && drag.from === p.sq;
            const isSelected = selectedSquare === p.sq;
            const centerX = isDragging ? drag.x : px(col);
            const centerY = isDragging ? drag.y : py(row);
            return (
              <Piece
                key={p.id}
                piece={p.piece}
                cell={cell}
                centerX={centerX}
                centerY={centerY}
                scale={isDragging ? 1.1 : isSelected ? 1.06 : 1}
                dragging={isDragging}
                selected={!!isSelected}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
