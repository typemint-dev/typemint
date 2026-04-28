# @typemint/core

## 0.10.0

### Minor Changes

- Add struct.required() method
- Add struct.merge() method
- Add struct.partial() method

### Patch Changes

- Make tuple strict about missing tuple members in runtime.

## 0.9.1

### Patch Changes

- Fix missing export

## 0.9.0

### Minor Changes

- Add struct() as flow operator
- Add tuple() as flow operator

## 0.8.0

### Minor Changes

- Add WithDetail shape

### Patch Changes

- Update README.md

## 0.7.0

### Minor Changes

- Add WithMessage shape
- Deprecate Discriminant.of in favor of Discriminant.from

## 0.6.0

### Minor Changes

- Add assertRecord
- remove Discriminant.getKey in favor of Discriminant.key
- Add WithCode discriminant

### Patch Changes

- Fix Discriminant.getKey to return key, not value

## 0.5.0

### Minor Changes

- Add Discriminant.tryMatch
- Add Discriminant.matchOr

## 0.4.0

### Minor Changes

- Add flow function
- Add assertDefined check.

## 0.3.2

### Patch Changes

- Update git repository url in package.json

## 0.3.1

### Patch Changes

- Fix the package dist folder and add a CHANGELOG to the published npm package

## 0.3.0

### Minor Changes

- add "Stamp" utility

## 0.2.0

### Minor Changes

- d9af6b3: Add "Kind" discriminant
- 115a923: Add `assert` and `AssertException` utility.

## 0.1.0

### Minor Changes

- Add `discriminant()` utility for building discriminated unions
