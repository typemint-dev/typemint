import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  OrdinalUnion,
  type InferOrdinalUnion,
  type OrdinalUnionDescriptor,
  type OrdinalUnionMethods,
} from './ordinal-union.js';
import {
  LiteralUnion,
  LiteralUnionMismatchError,
  assertLiteralUnionMember,
  type InferLiteralUnion,
  type InferLiteralUnionMismatchError,
  type LiteralUnionDescriptor,
  type LiteralUnionLike,
} from './literal-union.js';
import { Dictionary } from './dictionary.js';
import { PanicException } from '@typemint/core';
import { assertErr, assertOk } from '@typemint/result';

const Rank = OrdinalUnion([
  'team_lead',
  'manager',
  'senior_manager',
  'director',
  'vp',
  'c_suite',
]);
type Rank = InferOrdinalUnion<typeof Rank>;
type RankTuple = readonly [
  'team_lead',
  'manager',
  'senior_manager',
  'director',
  'vp',
  'c_suite',
];

describe('(unit) OrdinalUnion', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Create
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Create ordinal union', () => {
    it('should infer the member union', () => {
      // Assert
      expectTypeOf<Rank>().toEqualTypeOf<
        | 'team_lead'
        | 'manager'
        | 'senior_manager'
        | 'director'
        | 'vp'
        | 'c_suite'
      >();
    });

    it('should expose members as their literal values', () => {
      // Assert
      expect(Rank.director).toBe('director');
      expectTypeOf(Rank.director).toEqualTypeOf<'director'>();
    });

    it('should tag the descriptor as OrdinalUnion', () => {
      // Assert
      expect(Object.prototype.toString.call(Rank)).toBe(
        '[object OrdinalUnion]',
      );
    });

    it('should throw a PanicException if the tuple is empty', () => {
      // Act & Assert
      // @ts-expect-error - empty tuple is not a valid ordinal union
      expect(() => OrdinalUnion([])).toThrow(PanicException);
    });

    it('should reject a duplicate member at compile time', () => {
      // Act & Assert
      expect(() =>
        // @ts-expect-error - 'low' is declared twice; a member holds one rank
        OrdinalUnion(['low', 'high', 'low']),
      ).toThrow(/duplicate/);
    });

    it('should throw a PanicException on a duplicate member', () => {
      // Arrange
      // The compile-time check only sees literals; a widened tuple reaches the
      // runtime guard, which is what protects a JS caller.
      const literals = ['low', 'high', 'low'] as unknown as readonly [
        string,
        ...string[],
      ];

      // Act & Assert
      expect(() => OrdinalUnion(literals)).toThrow(/duplicate/);
    });

    it('should reject a union-typed member at compile time', () => {
      // Arrange
      const either = 'high' as 'low' | 'high';

      // Act & Assert — the runtime value is a single string, so nothing
      // panics; the compiler rejects the element because its type has no
      // single rank.
      expect(() =>
        // @ts-expect-error - 'low' | 'high' is an ambiguous member
        OrdinalUnion([either, 'low']),
      ).not.toThrow();
    });

    it('should accept a pattern-typed member next to a matching literal', () => {
      // Arrange — a pattern type stands for one unknown runtime value, exactly
      // as a `string`-typed variable does, so it is let through rather than
      // recorded as seen; a later literal matching the pattern is not its
      // duplicate. (A runtime collision is still caught by the runtime guard.)
      const prefixed = 'x-bar' as `x-${string}`;

      // Act
      const union = OrdinalUnion(['a', prefixed, 'x-foo']);

      // Assert
      expect(union.toArray()).toEqual(['a', 'x-bar', 'x-foo']);
    });

    it('should reject a LiteralUnion reserved key at compile time', () => {
      // Act & Assert
      expect(() =>
        // @ts-expect-error - 'size' is a descriptor property
        OrdinalUnion(['size', 'other']),
      ).toThrow(PanicException);
    });

    it('should reject an ordinal reserved key at compile time', () => {
      // Act & Assert
      expect(() =>
        // @ts-expect-error - 'max' is a descriptor method
        OrdinalUnion(['low', 'max']),
      ).toThrow(/reserved/);
    });

    it('should throw a PanicException on a reserved key', () => {
      // Arrange
      // As with duplicates, a widened tuple bypasses the compile-time check
      // and reaches the runtime guard.
      const literals = ['low', 'next'] as unknown as readonly [
        string,
        ...string[],
      ];

      // Act & Assert
      expect(() => OrdinalUnion(literals)).toThrow(/reserved/);
    });

    it('should name OrdinalUnion in a panic raised by the delegated checks', () => {
      // Arrange
      const empty = [] as unknown as readonly [string, ...string[]];
      const reserved = ['low', 'size'] as unknown as readonly [
        string,
        ...string[],
      ];

      // Act & Assert — the checks run inside the LiteralUnion factory, but the
      // caller wrote OrdinalUnion, so that is the name the message reports.
      expect(() => OrdinalUnion(empty)).toThrow(/^OrdinalUnion requires/);
      expect(() => OrdinalUnion(reserved)).toThrow(
        /^OrdinalUnion: member name "size"/,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Inherited LiteralUnion behavior
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Inherited LiteralUnion behavior', () => {
    it('should check membership with isOfType', () => {
      // Assert
      expect(Rank.isOfType('vp')).toBe(true);
      expect(Rank.isOfType('intern')).toBe(false);
    });

    it('should parse unknown input', () => {
      // Assert
      assertOk(Rank.parse('manager'));
      assertErr(Rank.parse('intern'));
      assertErr(Rank.parse(3));
    });

    it('should name OrdinalUnion in a panic from an inherited method', () => {
      // Act & Assert
      expect(() => Rank.ofUnsafe('intern')).toThrow(/^OrdinalUnion\.ofUnsafe:/);
      expect(() => Rank.parseUnsafe('intern')).toThrow(
        /^OrdinalUnion\.parseUnsafe:/,
      );
      expect(() => Rank.match('vp', {} as never)).toThrow(
        /^OrdinalUnion\.match:/,
      );
    });

    it('should keep size, iteration and toArray in declaration order', () => {
      // Assert
      expect(Rank.size).toBe(6);
      expect([...Rank]).toEqual(Rank.toArray());
      expect(Rank.toArray()[0]).toBe('team_lead');
    });

    it('should keep size out of the serialized shape', () => {
      // Assert — `size` is non-enumerable on a LiteralUnion descriptor and
      // must stay so once the ordinal re-defines it on its own descriptor.
      expect(JSON.parse(JSON.stringify(Rank))).toEqual({
        team_lead: 'team_lead',
        manager: 'manager',
        senior_manager: 'senior_manager',
        director: 'director',
        vp: 'vp',
        c_suite: 'c_suite',
      });
      expect(Object.keys(Rank)).not.toContain('size');
    });

    it('should freeze the descriptor', () => {
      // Arrange — the cast bypasses the `readonly` members, leaving only the
      // runtime guarantee under test.
      const mutable = Rank as unknown as Record<string, string>;

      // Act & Assert — ESM is always strict mode, so the write throws.
      expect(Object.isFrozen(Rank)).toBe(true);
      expect(() => {
        mutable['vp'] = 'hacked';
      }).toThrow(TypeError);
      expect(Rank.vp).toBe('vp');
    });

    it('should reject replacing an ordering method', () => {
      // Arrange
      const mutable = Rank as unknown as { compare: () => number };

      // Act & Assert
      expect(() => {
        mutable.compare = () => 0;
      }).toThrow(TypeError);
      expect(Rank.compare('vp', 'manager')).toBe(1);
    });

    it('should match exhaustively', () => {
      // Act
      const result = Rank.match('vp', {
        team_lead: () => 1,
        manager: () => 2,
        senior_manager: () => 3,
        director: () => 4,
        vp: () => 5,
        c_suite: () => 6,
      });

      // Assert
      expect(result).toBe(5);
    });
  });
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Property layout
  // ───────────────────────────────────────────────────────────────────────────
  describe('Property layout', () => {
    // The ordinal descriptor is composed by copying a `LiteralUnion`
    // descriptor with `Object.assign` and overwriting what it replaces. That
    // leans on facts about the `LiteralUnion` constructor no type can enforce:
    // which keys are own and enumerable (`Object.assign` copies those alone),
    // and which are defined rather than assigned. A change there would break
    // the ordinal silently, so the layout is pinned down here.

    const base = LiteralUnion([
      'team_lead',
      'manager',
      'senior_manager',
      'director',
      'vp',
      'c_suite',
    ]);

    const ordinalMethodKeys: readonly (keyof typeof Rank)[] = [
      'rank',
      'compare',
      'lt',
      'lte',
      'gt',
      'gte',
      'min',
      'max',
      'clamp',
      'next',
      'prev',
      'range',
      'atLeast',
      'atMost',
      'pick',
      'omit',
    ];

    it('should own exactly the base keys plus the ordering methods', () => {
      // Assert — `pick`, `omit` and the string tag are overwritten in place,
      // so composing adds the ordinal's own methods and loses nothing.
      expect(new Set(Reflect.ownKeys(Rank))).toEqual(
        new Set<string | symbol>([
          ...Reflect.ownKeys(base),
          ...ordinalMethodKeys,
        ]),
      );
    });

    it('should copy every own enumerable key of the base descriptor', () => {
      // Assert — only own *enumerable* keys are copied, so anything the base
      // holds otherwise would be dropped. `size` is the one key defined
      // non-enumerably, and the ordinal re-defines it rather than copy it.
      for (const key of Reflect.ownKeys(base)) {
        const enumerable = Object.prototype.propertyIsEnumerable.call(
          base,
          key,
        );
        expect([key, enumerable]).toEqual([key, key !== 'size']);
        expect(Object.prototype.hasOwnProperty.call(Rank, key)).toBe(true);
      }
    });

    it('should carry Symbol.iterator over as an own enumerable key', () => {
      // The ordinal defines no iterator of its own; `[...Rank]` works only
      // because the base holds `Symbol.iterator` as an own enumerable symbol,
      // which is what `Object.assign` copies. Moved to a prototype, or made
      // non-enumerable, it would vanish from the ordinal.

      // Assert
      expect(
        Object.prototype.propertyIsEnumerable.call(base, Symbol.iterator),
      ).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(Rank, Symbol.iterator)).toBe(
        true,
      );
      expect([...Rank]).toEqual(Rank.toArray());
    });

    it('should define size non-enumerably on both descriptors', () => {
      // Assert — non-enumerable on the base is why the ordinal has to
      // re-define it, and it must do so on the same terms or the cardinality
      // leaks into `JSON.stringify`.
      for (const union of [base, Rank] as const) {
        expect(Object.getOwnPropertyDescriptor(union, 'size')).toEqual({
          value: 6,
          enumerable: false,
          writable: false,
          configurable: false,
        });
      }
    });

    it('should override pick and omit with the ordering-preserving pair', () => {
      // Assert — the base's `pick`/`omit` return literal unions; the copies
      // sitting on the ordinal must be the ones that return ordinals.
      expect(
        Object.prototype.toString.call(base.pick(['vp', 'director'])),
      ).toBe('[object LiteralUnion]');
      expect(
        Object.prototype.toString.call(Rank.pick(['vp', 'director'])),
      ).toBe('[object OrdinalUnion]');
      expect(Object.prototype.toString.call(Rank.omit(['vp']))).toBe(
        '[object OrdinalUnion]',
      );
    });

    it('should give the descriptor a null prototype', () => {
      // Assert — nothing is inherited, so a member cannot shadow (or be
      // shadowed by) `Object.prototype`, and `__proto__` is an ordinary key.
      expect(Object.getPrototypeOf(Rank)).toBeNull();
      expect(Object.getPrototypeOf(base)).toBeNull();
    });

    it('should hold the same layout on a derived ordinal', () => {
      // Arrange — derivations re-enter the factory, so the composition runs
      // again on a smaller member set.
      const Executive = Rank.atLeast('director');

      // Assert
      expect(new Set(Reflect.ownKeys(Executive))).toEqual(
        new Set<string | symbol>([
          ...Reflect.ownKeys(LiteralUnion(['director', 'vp', 'c_suite'])),
          ...ordinalMethodKeys,
        ]),
      );
      expect(Object.getOwnPropertyDescriptor(Executive, 'size')).toEqual({
        value: 3,
        enumerable: false,
        writable: false,
        configurable: false,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Comparison
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Comparison', () => {
    it('should rank members by declaration position', () => {
      // Assert
      expect(Rank.rank('team_lead')).toBe(0);
      expect(Rank.rank('c_suite')).toBe(5);
    });

    it('should throw a PanicException when ranking a non-member', () => {
      // Act & Assert
      expect(() => Rank.rank('intern' as Rank)).toThrow(PanicException);
    });

    it('should compare members', () => {
      // Assert
      expect(Rank.compare('manager', 'vp')).toBe(-1);
      expect(Rank.compare('vp', 'vp')).toBe(0);
      expect(Rank.compare('vp', 'manager')).toBe(1);
    });

    it('should work as an unbound sort comparator', () => {
      // Arrange
      const ranks: Rank[] = ['vp', 'team_lead', 'director', 'manager'];

      // Act
      ranks.sort(Rank.compare);

      // Assert
      expect(ranks).toEqual(['team_lead', 'manager', 'director', 'vp']);
    });

    it('should answer lt / lte / gt / gte', () => {
      // Assert
      expect(Rank.lt('manager', 'director')).toBe(true);
      expect(Rank.lt('director', 'director')).toBe(false);
      expect(Rank.lte('director', 'director')).toBe(true);
      expect(Rank.gt('vp', 'director')).toBe(true);
      expect(Rank.gt('director', 'director')).toBe(false);
      expect(Rank.gte('director', 'director')).toBe(true);
      expect(Rank.gte('manager', 'director')).toBe(false);
    });

    it('should return min and max narrowed to the arguments', () => {
      // Act
      const highest = Rank.max('manager', 'vp', 'team_lead');
      const lowest = Rank.min('manager', 'vp', 'team_lead');

      // Assert
      expect(highest).toBe('vp');
      expect(lowest).toBe('team_lead');
      expectTypeOf(highest).toEqualTypeOf<'manager' | 'vp' | 'team_lead'>();
    });

    it('should clamp into an inclusive range', () => {
      // Assert
      expect(Rank.clamp('team_lead', 'manager', 'vp')).toBe('manager');
      expect(Rank.clamp('c_suite', 'manager', 'vp')).toBe('vp');
      expect(Rank.clamp('director', 'manager', 'vp')).toBe('director');
    });

    it('should throw a PanicException when clamp bounds are inverted', () => {
      // Act & Assert
      expect(() => Rank.clamp('director', 'vp', 'manager')).toThrow(
        PanicException,
      );
    });

    it('should step with next and prev, undefined past the ends', () => {
      // Assert
      expect(Rank.next('vp')).toBe('c_suite');
      expect(Rank.next('c_suite')).toBeUndefined();
      expect(Rank.prev('manager')).toBe('team_lead');
      expect(Rank.prev('team_lead')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Derivation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Derivation', () => {
    it('should slice an inclusive range with an exact type', () => {
      // Act
      const Management = Rank.range('manager', 'director');

      // Assert
      expect(Management.toArray()).toEqual([
        'manager',
        'senior_manager',
        'director',
      ]);
      expectTypeOf<InferOrdinalUnion<typeof Management>>().toEqualTypeOf<
        'manager' | 'senior_manager' | 'director'
      >();
    });

    it('should throw a PanicException on an inverted range', () => {
      // Act & Assert
      expect(() => Rank.range('vp', 'manager')).toThrow(PanicException);
    });

    it('should derive atLeast and atMost with exact types', () => {
      // Act
      const Executive = Rank.atLeast('director');
      const Junior = Rank.atMost('manager');

      // Assert
      expect(Executive.toArray()).toEqual(['director', 'vp', 'c_suite']);
      expect(Junior.toArray()).toEqual(['team_lead', 'manager']);
      expectTypeOf<InferOrdinalUnion<typeof Executive>>().toEqualTypeOf<
        'director' | 'vp' | 'c_suite'
      >();
      expectTypeOf<InferOrdinalUnion<typeof Junior>>().toEqualTypeOf<
        'team_lead' | 'manager'
      >();
    });

    it('should type atMost with a union argument through its highest member', () => {
      // Arrange
      const value = 'director' as 'manager' | 'director';

      // Act
      const Below = Rank.atMost(value);
      const BelowAny = Rank.atMost(value as Rank);

      // Assert
      expect(Below.toArray()).toEqual([
        'team_lead',
        'manager',
        'senior_manager',
        'director',
      ]);
      expectTypeOf<InferOrdinalUnion<typeof Below>>().toEqualTypeOf<
        'team_lead' | 'manager' | 'senior_manager' | 'director'
      >();
      expectTypeOf<InferOrdinalUnion<typeof BelowAny>>().toEqualTypeOf<Rank>();
    });

    it('should type atLeast with a union argument from its lowest member', () => {
      // Arrange
      const value = 'vp' as 'director' | 'vp';

      // Act
      const Above = Rank.atLeast(value);

      // Assert
      expect(Above.toArray()).toEqual(['vp', 'c_suite']);
      expectTypeOf<InferOrdinalUnion<typeof Above>>().toEqualTypeOf<
        'director' | 'vp' | 'c_suite'
      >();
    });

    it('should type range with union bounds as the widest possible slice', () => {
      // Arrange
      const from = 'manager' as 'manager' | 'director';
      const to = 'director' as 'director' | 'vp';

      // Act
      const Slice = Rank.range(from, to);
      const Any = Rank.range(from as Rank, to as Rank);

      // Assert
      expect(Slice.toArray()).toEqual([
        'manager',
        'senior_manager',
        'director',
      ]);
      expectTypeOf<InferOrdinalUnion<typeof Slice>>().toEqualTypeOf<
        'manager' | 'senior_manager' | 'director' | 'vp'
      >();
      expectTypeOf<InferOrdinalUnion<typeof Any>>().toEqualTypeOf<Rank>();
    });

    it('should ignore union upper bounds that lie below the lower bound', () => {
      // Arrange
      const to = 'director' as 'team_lead' | 'director';

      // Act
      const Slice = Rank.range('manager', to);

      // Assert
      expectTypeOf<InferOrdinalUnion<typeof Slice>>().toEqualTypeOf<
        'manager' | 'senior_manager' | 'director'
      >();
    });

    it('should type an inverted literal range as never', () => {
      // Assert
      expectTypeOf(() => Rank.range('vp', 'manager')).returns.toBeNever();
    });

    it('should narrow through a derived ordinal', () => {
      // Arrange
      const value: Rank = 'vp';

      // Act & Assert
      if (Rank.atLeast('director').isOfType(value)) {
        expectTypeOf(value).toEqualTypeOf<'vp'>();
      }
    });

    it('should keep parent order on pick regardless of argument order', () => {
      // Act
      const Picked = Rank.pick(['vp', 'team_lead', 'director']);

      // Assert
      expect(Picked.toArray()).toEqual(['team_lead', 'director', 'vp']);
      expect(Picked.lt('team_lead', 'vp')).toBe(true);
      expectTypeOf<typeof Picked>().toEqualTypeOf<
        OrdinalUnionDescriptor<readonly ['team_lead', 'director', 'vp']>
      >();
    });

    it('should reject a non-member in pick', () => {
      // Act & Assert
      // @ts-expect-error - 'intern' is not a member
      expect(() => Rank.pick(['intern'])).toThrow(PanicException);
    });

    it('should omit members keeping parent order', () => {
      // Act
      const NonExec = Rank.omit(['vp', 'c_suite']);

      // Assert
      expect(NonExec.toArray()).toEqual([
        'team_lead',
        'manager',
        'senior_manager',
        'director',
      ]);
      expect(NonExec.isOfType('vp')).toBe(false);
    });

    it('should throw a PanicException when omitting every member', () => {
      // Arrange
      const Two = OrdinalUnion(['low', 'high']);

      // Act & Assert
      expect(() => Two.omit(['low', 'high'])).toThrow(PanicException);
    });

    it('should keep exact pick/omit types for a 150-member ordinal', () => {
      // Arrange
      // Written out as a literal (not generated) so the tuple type is exact.
      // Past ~100 members a non-tail-recursive filter hits TS2589 and the
      // derived types silently collapse to `never`.
      // prettier-ignore
      const Large = OrdinalUnion([
        'm000', 'm001', 'm002', 'm003', 'm004', 'm005', 'm006', 'm007', 'm008', 'm009',
        'm010', 'm011', 'm012', 'm013', 'm014', 'm015', 'm016', 'm017', 'm018', 'm019',
        'm020', 'm021', 'm022', 'm023', 'm024', 'm025', 'm026', 'm027', 'm028', 'm029',
        'm030', 'm031', 'm032', 'm033', 'm034', 'm035', 'm036', 'm037', 'm038', 'm039',
        'm040', 'm041', 'm042', 'm043', 'm044', 'm045', 'm046', 'm047', 'm048', 'm049',
        'm050', 'm051', 'm052', 'm053', 'm054', 'm055', 'm056', 'm057', 'm058', 'm059',
        'm060', 'm061', 'm062', 'm063', 'm064', 'm065', 'm066', 'm067', 'm068', 'm069',
        'm070', 'm071', 'm072', 'm073', 'm074', 'm075', 'm076', 'm077', 'm078', 'm079',
        'm080', 'm081', 'm082', 'm083', 'm084', 'm085', 'm086', 'm087', 'm088', 'm089',
        'm090', 'm091', 'm092', 'm093', 'm094', 'm095', 'm096', 'm097', 'm098', 'm099',
        'm100', 'm101', 'm102', 'm103', 'm104', 'm105', 'm106', 'm107', 'm108', 'm109',
        'm110', 'm111', 'm112', 'm113', 'm114', 'm115', 'm116', 'm117', 'm118', 'm119',
        'm120', 'm121', 'm122', 'm123', 'm124', 'm125', 'm126', 'm127', 'm128', 'm129',
        'm130', 'm131', 'm132', 'm133', 'm134', 'm135', 'm136', 'm137', 'm138', 'm139',
        'm140', 'm141', 'm142', 'm143', 'm144', 'm145', 'm146', 'm147', 'm148', 'm149',
      ]);
      type Large = InferOrdinalUnion<typeof Large>;

      // Act
      const Picked = Large.pick(['m149', 'm000']);
      const Omitted = Large.omit(['m000']);

      // Assert
      expect(Picked.toArray()).toEqual(['m000', 'm149']);
      expect(Omitted.size).toBe(149);
      expectTypeOf<InferOrdinalUnion<typeof Picked>>().toEqualTypeOf<
        'm000' | 'm149'
      >();
      expectTypeOf<InferOrdinalUnion<typeof Omitted>>().toEqualTypeOf<
        Exclude<Large, 'm000'>
      >();
    });

    it('should type every derivation of a widened union as its whole tuple', () => {
      // Arrange
      // A widened tuple is what `derive` hands the factory when it re-invokes
      // it on a runtime slice, and what a JavaScript caller passes. It has no
      // positions the compiler can walk, so every derivation is typed as the
      // widest result the call can return — the parent's own member tuple —
      // rather than as the one-element tuple the walk would otherwise close on.
      const literals = ['low', 'mid', 'high'] as unknown as readonly [
        string,
        ...string[],
      ];
      const Wide = OrdinalUnion(literals);

      // Act
      const below = Wide.atMost('mid');
      const above = Wide.atLeast('mid');
      const ranged = Wide.range('low', 'high');
      const picked = Wide.pick(['low']);
      const omitted = Wide.omit(['low']);

      // Assert
      // The member arguments below are the type assertion: a derived tuple
      // narrower than the parent's types its members as `never` and rejects
      // every one of these calls, which is what `pick` did while the filter
      // dropped the rest element instead of carrying it through.
      expect(below.toArray()).toEqual(['low', 'mid']);
      expect(above.rank('high')).toBe(1);
      expect(ranged).toBe(Wide);
      expect(picked.rank('low')).toBe(0);
      expect(omitted.gt('high', 'mid')).toBe(true);
    });

    it('should return the same descriptor for a repeated derivation', () => {
      // Assert
      expect(Rank.atLeast('director')).toBe(Rank.atLeast('director'));
      expect(Rank.atMost('manager')).toBe(Rank.atMost('manager'));
      expect(Rank.range('manager', 'vp')).toBe(Rank.range('manager', 'vp'));
      expect(Rank.pick(['vp', 'manager'])).toBe(Rank.pick(['vp', 'manager']));
      expect(Rank.omit(['vp'])).toBe(Rank.omit(['vp']));
    });

    it('should share one descriptor across methods deriving the same members', () => {
      // Assert — the cache is keyed by the members, not by the call.
      expect(Rank.atLeast('vp')).toBe(Rank.range('vp', 'c_suite'));
      expect(Rank.atMost('manager')).toBe(Rank.pick(['manager', 'team_lead']));
      expect(Rank.omit(['team_lead'])).toBe(Rank.atLeast('manager'));
    });

    it('should return the descriptor itself when every member is kept', () => {
      // Assert
      expect(Rank.atLeast('team_lead')).toBe(Rank);
      expect(Rank.range('team_lead', 'c_suite')).toBe(Rank);
      expect(Rank.pick(Rank.toArray())).toBe(Rank);
    });

    it('should keep derivations of a derived ordinal stable', () => {
      // Act
      const Upper = Rank.atLeast('director');

      // Assert — identity is per parent: the same members reached through a
      // different parent are a distinct, equivalent descriptor.
      expect(Upper.atMost('vp')).toBe(Rank.atLeast('director').atMost('vp'));
      expect(Upper.atMost('vp')).not.toBe(Rank.range('director', 'vp'));
      expect(Upper.atMost('vp').toArray()).toEqual(
        Rank.range('director', 'vp').toArray(),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Substitutability
  // ───────────────────────────────────────────────────────────────────────────
  describe('Substitutability for a literal union', () => {
    it('should be assignable to LiteralUnionLike', () => {
      // Act
      const union: LiteralUnionLike<Rank> = Rank;

      // Assert
      expect(union.isOfType('vp')).toBe(true);
    });

    it('should be accepted by a helper generic over LiteralUnionLike', () => {
      // Arrange
      function labels<T extends string>(union: LiteralUnionLike<T>): T[] {
        return [...union.toArray()];
      }

      // Act & Assert — the same helper serves both descriptors
      expect(labels(Rank)).toEqual(Rank.toArray());
      expect(labels(LiteralUnion(['germany', 'france']))).toEqual([
        'germany',
        'france',
      ]);
    });

    it('should be accepted by assertLiteralUnionMember', () => {
      // Arrange
      const value: unknown = 'director';

      // Act
      assertLiteralUnionMember(Rank, value);

      // Assert — narrowed in place, same binding
      expectTypeOf(value).toEqualTypeOf<Rank>();
      expect(Rank.gte(value, 'manager')).toBe(true);
    });

    it('should be accepted by Dictionary.fromLiteralUnion', () => {
      // Act
      const weight = Dictionary.fromLiteralUnion(Rank, {
        team_lead: 1,
        manager: 2,
        senior_manager: 3,
        director: 4,
        vp: 5,
        c_suite: 6,
      });

      // Assert
      expect(weight.director).toBe(4);
    });

    it('should have its members recovered by InferLiteralUnion', () => {
      // Assert
      expectTypeOf<InferLiteralUnion<typeof Rank>>().toEqualTypeOf<Rank>();
    });

    it('should have its mismatch error recovered by InferLiteralUnionMismatchError', () => {
      // Assert
      expectTypeOf<InferLiteralUnionMismatchError<typeof Rank>>().toEqualTypeOf<
        LiteralUnionMismatchError<Rank>
      >();
    });

    it('should NOT be assignable to LiteralUnionDescriptor', () => {
      // `pick`/`omit` return ordinals and the tag reads 'OrdinalUnion', so the
      // two descriptors are deliberately not interchangeable. Helpers reach
      // for `LiteralUnionLike` instead, which is what the tests above cover.

      // Assert
      // @ts-expect-error - an ordinal is a LiteralUnionLike, not a descriptor
      const union: LiteralUnionDescriptor<Rank> = Rank;
      expect(union).toBe(Rank);
    });

    it('should NOT accept a derived ordinal where the parent is expected', () => {
      // The descriptor's members are declared as function-typed *properties*
      // rather than with method shorthand, so their parameters are checked
      // contravariantly. With method shorthand TypeScript would check them
      // bivariantly, a sub-ordinal would assign to any partial shape of its
      // parent — `Pick<…>`, a hand-written comparator interface — and the
      // call below would panic instead of failing to compile.
      type RankComparator = Pick<
        OrdinalUnionMethods<RankTuple>,
        'compare' | 'gte'
      >;

      // Arrange
      const Executive = Rank.atLeast('director');

      // Assert
      // @ts-expect-error - Executive does not compare 'manager'
      const comparator: RankComparator = Executive;
      expect(() => comparator.gte('manager', 'vp')).toThrow(PanicException);
    });
  });
});
