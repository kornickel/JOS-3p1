# -*- coding: utf-8 -*-
import csv
import datetime as dt
import os

import numpy as np
# Import from relative path
try:
    from . import thermoregulation as threg
    from . import matrix
    from .matrix import NUM_NODES, INDEX, VINDEX, BODY_NAMES, remove_bodyname
    from .comfmod import preferred_temp
    from . import construction as cons
    from .construction import _BSAst
    from .params import ALL_OUT_PARAMS, show_outparam_docs
# Import from absolute path
# These codes are for debugging
except ImportError:
    from jos3 import thermoregulation as threg
    from jos3 import matrix
    from jos3.matrix import NUM_NODES, INDEX, VINDEX, BODY_NAMES, remove_bodyname
    from jos3.comfmod import preferred_temp
    from jos3 import construction as cons
    from jos3.construction import _BSAst
    from jos3.params import ALL_OUT_PARAMS, show_outparam_docs


class JOS3():
    """
    JOS-3 is a numeric model to simulate a human thermoregulation.
    You can see all the system of the model from following journal.

    Y.Takahashi, A.Nomoto, S.Yoda, R.Hisayama, M.Ogata, Y.Ozeki, S.Tanabe,
    Thermoregulation Model JOS-3 with New Open Source Code, Energy & Buildings (2020),
    doi: https://doi.org/10.1016/j.enbuild.2020.110575


    Parameters
    -------
    height : float, optional
        Body height [m]. The default is 1.72.
    weight : float, optional
        Body weight [kg]. The default is 74.43.
    fat : float, optional
        Fat percentage [%]. The default is 15.
    age : int, optional
        Age [years]. The default is 20.
    sex : str, optional
        Sex ("male" or "female"). The default is "male".
    ci : float, optional
        Cardiac index [L/min/m2]. The default is 2.6432.
    bmr_equation : str, optional
        Choose a BMR equation. The default is "harris-benedict".
        To use the equation for Japanese, enter "japanese".
    bsa_equation : str, optional
        Choose a BSA equation.
        You can choose "dubois", "fujimoto", "kruazumi", "takahira".
        The default is "dubois".
    ex_output : None, list or "all", optional
        If you want to get extra output parameters, set the parameters as the list format like ["BFsk", "BFcr", "Tar"].
        If ex_output is "all", all parameters are output.
        The default is None, which outputs only important parameters such as local skin temperatures.


    Setter & Getter
    -------
    Input parameters of environmental conditions are set as the Setter format.
    If you set the different conditons in each body parts, set the list.
    List input must be 17 lengths and means the input of "Head", "Neck", "Chest",
    "Back", "Pelvis", "LShoulder", "LArm", "LHand", "RShoulder", "RArm",
    "RHand", "LThigh", "LLeg", "LFoot", "RThigh", "RLeg" and "RFoot".

    Ta : float or list
        Air temperature [oC].
    Tr : float or list
        Mean radiant temperature [oC].
    To : float or list
        Operative temperature [oC].
    Va : float or list
        Air velocity [m/s].
    RH : float or list
        Relative humidity [%].
    Icl : float or list
        Clothing insulation [clo].
    PAR : float
        Physical activity ratio [-].
        This equals the ratio of metaboric rate to basal metablic rate.
        PAR of sitting quietly is 1.2.
    posture : str
        Choose a posture from standing, sitting or lying.
    bodytemp : numpy.ndarray (85,)
        All segment temperatures of JOS-3

    Getter
    -------
    JOS3 has some useful getters to check the current parameters.

    BSA : numpy.ndarray (17,)
        Body surface areas by local body segments [m2].
    Rt : numpy.ndarray (17,)
        Dry heat resistances between the skin and ambience areas by local body segments [K.m2/W].
    Ret : numpy.ndarray (17,)
        Wet (Evaporative) heat resistances between the skin and ambience areas by local body segments [Pa.m2/W].
    Wet : numpy.ndarray (17,)
        Skin wettedness on local body segments [-].
    WetMean : float
        Mean skin wettedness of the whole body [-].
    TskMean : float
        Mean skin temperature of the whole body [oC].
    Tsk : numpy.ndarray (17,)
        Skin temperatures by the local body segments [oC].
    Tcr : numpy.ndarray (17,)
        Skin temperatures by the local body segments [oC].
    Tcb : numpy.ndarray (1,)
        Core temperatures by the local body segments [oC].
    Tar : numpy.ndarray (17,)
        Arterial temperatures by the local body segments [oC].
    Tve : numpy.ndarray (17,)
        Vein temperatures by the local body segments [oC].
    Tsve : numpy.ndarray (12,)
        Superfical vein temperatures by the local body segments [oC].
    Tms : numpy.ndarray (2,)
        Muscle temperatures of Head and Pelvis [oC].
    Tfat : numpy.ndarray (2,)
        Fat temperatures of Head and Pelvis  [oC].
    BMR : float
        Basal metabolic rate [W/m2].


    Examples
    -------

    Make a model:

    >>> import jos3
    >>> model = jos3.JOS3(height=1.7, weight=60, age=30)

    Set the first phase:

    >>> model.To = 28  # Operative temperature [oC]
    >>> model.RH = 40  # Relative humidity [%]
    >>> model.Va = 0.2  # Air velocity [m/s]
    >>> model.PAR = 1.2  # Physical activity ratio [-]
    >>> model.posture = "sitting"  # Set the posture
    >>> model.simulate(60)  # Exposre time = 60 [min]

    Set the next phase:

    >>> model.To = 20  # Change only operative temperature
    >>> model.simulate(60)  # Additional exposre time = 60 [min]


    Show the results:

    >>> import pandas as pd
    >>> df = pd.DataFrame(model.dict_results())  # Make pandas.DataFrame
    >>> df.TskMean.plot()  # Show the graph of mean skin temp.

    Exporting the results as csv:

    >>> model.to_csv(folder="C:/Users/takahashi/Desktop")

    Show the documentaion of the output parameters:

    >>> print(jos3.show_outparam_docs())

    Check basal metabolic rate [W/m2] using Getters:

    >>> model.BMR
    """


    def __init__(
            self,
            height=1.72,
            weight=74.43,
            fat=15,
            age=20,
            sex="male",
            ci=2.59,
            bmr_equation="harris-benedict",
            bsa_equation="dubois",
            ex_output=None,
            ):

        self._height = height
        self._weight = weight
        self._fat = fat
        self._sex = sex
        self._age = age
        self._ci = ci
        self._bmr_equation = bmr_equation
        self._bsa_equation = bsa_equation
        self._ex_output = ex_output

        # Body surface area [m2]
        self._bsa_rate = cons.bsa_rate(height, weight, bsa_equation,)
        # Body surface area rate [-]
        self._bsa = cons.localbsa(height, weight, bsa_equation,)
        # Basal blood flow rate [-]
        self._bfb_rate = cons.bfb_rate(height, weight, bsa_equation, age, ci)
        # Thermal conductance [W/K]
        self._cdt = cons.conductance(height, weight, bsa_equation, fat,)
        # Thermal capacity [J/K]
        self._cap = cons.capacity(height, weight, bsa_equation, age, ci)

        # Set point temp [oC]
        self.setpt_cr = np.ones(17)*37  # core
        self.setpt_sk = np.ones(17)*34  # skin

        # Initial body temp [oC]
        self._bodytemp = np.ones(NUM_NODES) * 36

        # Default values of input condition
        self._ta = np.ones(17)*28.8
        self._tr = np.ones(17)*28.8
        self._rh = np.ones(17)*50
        self._va = np.ones(17)*0.1
        self._clo = np.zeros(17)
        self._iclo = np.ones(17) * 0.45
        # Clothing emissivity for each body segment (0–1). Default 1.0 (neutral --
        # matches the base model, whose empirical hr coefficients already assume
        # near-blackbody skin/clothing). A value of 1 corresponds to a perfect
        # black body, while lower values (e.g. reflective/foil garments) reduce
        # radiative heat transfer. Either a scalar or a 17-length iterable can be
        # supplied; scalars will be broadcast to all segments.
        self._emissivity = np.ones(17)
        # Clothing air permeability for each body segment (0–1). Default 1.0.
        # Describes how freely air can flow through the clothing layer. A value
        # of 1 represents fully permeable (no wind block), while values closer to
        # 0 represent windproof garments. Scalars are broadcast to all segments.
        self._airperm = np.ones(17)

        # --- Water absorption parameters ---
        # Fraction of produced sweat absorbed by the clothing.  A value of
        # 0 means no absorption (all sweat immediately evaporates), while
        # 1 means all produced sweat is stored in the clothing.  Scalars are
        # broadcast to all segments.
        self._waterabs = np.zeros(17)
        # Current amount of water stored in the clothing on each segment [g].
        # At initialisation the clothing is dry (no stored water).  The
        # storage increases when sweat is absorbed and decreases by
        # evaporation according to the release time constant.
        self._water_storage = np.zeros(17)
        # Characteristic time constant for water release [s].  This
        # parameter controls how quickly water stored in the clothing
        # evaporates when no additional moisture is supplied.  Higher values
        # correspond to slower drying fabrics.  Scalars are broadcast to
        # all segments.  Default is one hour (3600 s).
        self._release_tau = np.ones(17) * 3600.0
        # Maximum water storage capacity per segment [g].  This limits how
        # much water the clothing can hold.  If storage exceeds this value,
        # the excess evaporates immediately.  Scalars are broadcast to
        # all segments.  Default is 100 g per segment.
        self._max_storage = np.ones(17) * 100.0
        # Skin wettedness from the most recent _run(), after the water
        # absorption/delayed evaporation adjustment (see _run()). Backs the
        # Wet/WetMean getters so they agree with dict_results()/to_csv()
        # instead of recomputing a value that ignores that adjustment.
        self._last_wet = np.zeros(17)
        self._par = 1.25 # Physical activity ratio
        self._posture = "standing"
        self._hc = None
        self._hr = None
        self.ex_q = np.zeros(NUM_NODES)
        self._t = dt.timedelta(0) # Elapsed time
        self._cycle = 0 # Cycle time
        self.model_name = "JOS3"
        self.options = {
                "nonshivering_thermogenesis": True,
                "cold_acclimated": False,
                "shivering_threshold": False,
                "limit_dshiv/dt": False,
                "bat_positive": False,
                "ava_zero": False,
                "shivering": False,}
        threg.PRE_SHIV = 0 # reset
        self._history = []
        self._t = dt.timedelta(0) # Elapsed time
        self._cycle = 0 # Cycle time
        self._atmospheric_pressure = 101.33  # kPa. Used to fix the hc, he values

        # Reset setpoint temperature
        dictout = self._reset_setpt()
        self._history.append(dictout)  # Save the last model parameters


    def _reset_setpt(self):
        """
        Reset setpoint temperature by steady state calculation.
        Be careful, input parameters (Ta, Tr, RH, Va, Icl, PAR) and body
        tempertures are also resetted.

        Returns
        -------
        Parameters of JOS-3 : dict
        """
        # Set operative temperature under PMV=0 environment
        # PAR = 1.25
        # 1 met = 58.15 W/m2
        met = self.BMR * 1.25 / 58.15  # [met]
        self.To = preferred_temp(met=met)
        self.RH = 50
        self.Va = 0.1
        self.Icl = 0
        self.PAR = 1.25

        # Steady-calculation
        self.options["ava_zero"] = True
        for t in range(10):
            dictout = self._run(dtime=60000, passive=True)

        # Set new setpoint temperatures
        self.setpt_cr = self.Tcr
        self.setpt_sk = self.Tsk
        self.options["ava_zero"] = False

        return dictout


    def simulate(self, times, dtime=60, output=True):
        """
        Execute JOS-3 model.

        Parameters
        ----------
        times : int
            Number of loops of a simulation
        dtime : int or float, optional
            Time delta [sec]. The default is 60.
        output : bool, optional
            If you don't record paramters, set False. The default is True.

        Returns
        -------
        None.

        """
        for t in range(times):
            self._t += dt.timedelta(0, dtime)
            self._cycle += 1
            dictdata = self._run(dtime=dtime, output=output)
            if output:
                # self.history.append(dictdata)
                self._history.append(dictdata)


    def _run(self, dtime=60, passive=False, output=True):
        """
        Run a model for a once and get model parameters.

        Parameters
        ----------
        dtime : int or float, optional
            Time delta [sec]. The default is 60.
        passive : bool, optional
            If you run a passive model, set True. The default is False.
        output : bool, optional
            If you don't need paramters, set False. The default is True.

        Returns
        -------
        dictout : dictionary
            Output parameters.

        """
        tcr = self.Tcr
        tsk = self.Tsk

        # Convective and radiative heat transfer coefficient [W/K.m2]
        hc = threg.fixed_hc(threg.conv_coef(self._posture, self._va, self._ta, tsk,), self._va)
        hr = threg.fixed_hr(threg.rad_coef(self._posture,))
        # Manual setting
        if self._hc is not None:
            hc = self._hc
        if self._hr is not None:
            hr = self._hr


        # Apply clothing properties to heat transfer coefficients.
        # Air permeability (wind-blocking) only affects the dry (sensible)
        # pathway -- vapor transport is governed independently by the
        # intrinsic clothing vapor permeability (Icl_evap_eff), so the
        # evaporative resistance below is computed from the unscaled hc.
        perm = _to17array(self._airperm)
        hc_dry = hc * perm
        eps = _to17array(self._emissivity)
        hr = hr * eps

        # Operative temp. [oC], heat and evaporative heat resistance [m2.K/W], [m2.kPa/W]
        to = threg.operative_temp(self._ta, self._tr, hc_dry, hr,)
        r_t = threg.dry_r(hc_dry, hr, self._clo, pt=self._atmospheric_pressure)
        # Calculate evaporative resistance using the intrinsic clothing vapor
        # permeability.  Water absorption effects are handled separately in
        # the evaporation calculation.
        r_et = threg.wet_r(hc, self._clo, iclo=self._iclo, pt=self._atmospheric_pressure)

        #------------------------------------------------------------------
        # Thermoregulation
        #------------------------------------------------------------------
        # Setpoint temperature of thermoregulation
        if passive:
            setpt_cr = tcr.copy()
            setpt_sk = tsk.copy()
        else:
            setpt_cr = self.setpt_cr.copy()
            setpt_sk = self.setpt_sk.copy()
        # Difference between setpoint and body temperatures
        err_cr = tcr - setpt_cr
        err_sk = tsk - setpt_sk

        # Skin wettedness [-], Esk, Emax, Esw [W]
        wet, e_sk, e_max, e_sweat = threg.evaporation(
                err_cr, err_sk, tsk,
                self._ta, self._rh, r_et,
                self._height, self._weight, self._bsa_equation, self._age)

        # ------------------------------------------------------------------
        # Preserve the original sweating energy before applying any water
        # absorption effects.  This value represents the rate of sweat
        # production (energy per unit area) calculated by the base
        # thermoregulation model.  Weight loss due to sweating should be
        # based on this unmodified value, not the post‑processed value
        # after storage and delayed evaporation.  We copy the array so
        # subsequent modifications of ``e_sweat`` do not affect the
        # stored reference.
        e_sweat_orig = e_sweat.copy()

        # ------------------------------------------------------------------
        # Water absorption and delayed evaporation
        # ------------------------------------------------------------------
        # Convert the original evaporative heat loss at the skin (e_sweat_orig)
        # to the mass rate of sweat production [g/s].  The latent heat of
        # vaporisation is approximated as 2418 J/g.  Note that sweat
        # production is determined from the original e_sweat values and
        # does not depend on subsequent storage effects.
        latent_heat = 2418.0  # J/g
        # Mass rate of sweat production per segment [g/s]
        m_sweat_rate = e_sweat_orig / latent_heat
        # Total mass of sweat produced in this time step [g]
        m_sweat = m_sweat_rate * dtime
        # Fraction of sweat absorbed into clothing
        abs_frac = _to17array(self._waterabs)
        # Mass of sweat absorbed by clothing
        m_absorbed = abs_frac * m_sweat
        # Mass of sweat that evaporates immediately (does not enter storage)
        m_evap_immediate = (1.0 - abs_frac) * m_sweat
        # Update water storage (current water in clothing) [g]
        self._water_storage = self._water_storage + m_absorbed
        # Limit storage by maximum capacity; the clothing cannot hold more
        # than max_storage, so any excess simply drips off. Dripped water
        # provides no evaporative cooling (unlike the original version of
        # this code, it is NOT added to m_evap_immediate) -- its mass loss
        # from the body is already accounted for via e_sweat_orig/wlesk.
        self._water_storage = np.minimum(self._water_storage, self._max_storage)
        # Evaporative capacity available this step [g], derived from e_max --
        # the same skin-to-ambient vapor pressure gradient that bounds all
        # evaporation. Stored water may only be released up to this budget,
        # net of what m_evap_immediate already uses. This keeps the water
        # storage mass balance consistent with the energy balance: e.g. in
        # saturated/humid air (e_max ~ 0) stored water is not silently
        # drained without producing the corresponding cooling effect.
        max_evap_mass = e_max / latent_heat * dtime
        remaining_capacity = np.maximum(max_evap_mass - m_evap_immediate, 0.0)
        # Release stored water according to the release time constant τ.
        # The release rate [g/s] is the stored water divided by τ.
        release_rate = self._water_storage / self._release_tau
        # Amount of water released during this time step [g]
        m_release = release_rate * dtime
        # Ensure we do not release more water than is currently stored, and
        # not more than the remaining evaporative capacity allows.
        m_release = np.minimum(m_release, self._water_storage)
        m_release = np.minimum(m_release, remaining_capacity)
        # Update storage after release
        self._water_storage = self._water_storage - m_release
        # Total mass evaporated in this time step [g]
        m_evap_total = m_evap_immediate + m_release
        # Mass evaporation rate [g/s]
        m_evap_rate = m_evap_total / dtime
        # Convert the total evaporated mass back to a heat loss rate [W]
        # energy (J/s) = mass (g/s) * latent_heat (J/g)
        e_evap_rate = m_evap_rate * latent_heat
        # Compute the new wettedness.  We follow the same formulation as
        # thermoregulation: wet = 0.06 + 0.94*(e_evap_rate/e_max), capped
        # at 1.  When e_max is zero (unlikely), avoid division by zero.
        ratio_e = np.divide(e_evap_rate, e_max, out=np.zeros_like(e_evap_rate), where=e_max > 0)
        wet_new = 0.06 + 0.94 * ratio_e
        wet_new = np.clip(wet_new, 0.0, 1.0)
        # Compute new evaporative heat loss at the skin [W]
        e_sk = wet_new * e_max
        # Compute new effective sweating energy [W]
        e_sweat = (wet_new - 0.06) / 0.94 * e_max
        # Update wet variable
        wet = wet_new
        # Persist for the Wet/WetMean getters (see __init__), so they agree
        # with this step's dict_results()/to_csv() output.
        self._last_wet = wet

        # Skin blood flow, basal skin blood flow [L/h]
        bf_sk = threg.skin_bloodflow(err_cr, err_sk,
            self._height, self._weight, self._bsa_equation, self._age, self._ci)

        # Hand, Foot AVA blood flow [L/h]
        bf_ava_hand, bf_ava_foot = threg.ava_bloodflow(err_cr, err_sk,
            self._height, self._weight, self._bsa_equation, self._age, self._ci)
        if self.options["ava_zero"] and passive:
            bf_ava_hand = 0
            bf_ava_foot = 0

        # Thermogenesis by shivering [W]
        mshiv = threg.shivering(
                err_cr, err_sk, tcr, tsk,
                self._height, self._weight, self._bsa_equation, self._age, self._sex, dtime,
                self.options,)

        # Thermogenesis by non-shivering [W]
        if self.options["nonshivering_thermogenesis"]:
            mnst = threg.nonshivering(err_cr, err_sk,
                self._height, self._weight, self._bsa_equation, self._age,
                self.options["cold_acclimated"], self.options["bat_positive"])
        else: # not consider NST
            mnst = np.zeros(17)

        #------------------------------------------------------------------
        # Thermogenesis
        #------------------------------------------------------------------
        # Basal thermogenesis [W]
        mbase = threg.local_mbase(
                self._height, self._weight, self._age, self._sex,
                self._bmr_equation,)
        mbase_all = sum([m.sum() for m in mbase])

        # Thermogenesis by work [W]
        mwork = threg.local_mwork(mbase_all, self._par)

        # Sum of thermogenesis in core, muscle, fat, skin [W]
        qcr, qms, qfat, qsk = threg.sum_m(mbase, mwork, mshiv, mnst,)
        qall = qcr.sum() + qms.sum() + qfat.sum() + qsk.sum()

        #------------------------------------------------------------------
        # Other
        #------------------------------------------------------------------
        # Blood flow in core, muscle, fat [L/h]
        bf_cr, bf_ms, bf_fat = threg.crmsfat_bloodflow(mwork, mshiv,
            self._height, self._weight, self._bsa_equation, self._age, self._ci)

        # Heat loss by respiratory
        p_a = threg.antoine(self._ta)*self._rh/100
        res_sh, res_lh = threg.resp_heatloss(self._ta[0], p_a[0], qall)

        # Sensible heat loss [W]
        shlsk = (tsk - to) / r_t * self._bsa

        # Cardiac output [L/h]
        co = threg.sum_bf(
                bf_cr, bf_ms, bf_fat, bf_sk, bf_ava_hand, bf_ava_foot)

        # Weight loss rate by evaporation [g/sec].  Weight loss is based
        # on the original rate of sweat production (before absorption into
        # the clothing) plus the baseline insensible perspiration.  Use
        # the stored value ``e_sweat_orig`` here so that absorption and
        # delayed release of sweat do not influence the body’s mass loss.
        latent_heat_w = 2418.0
        wlesk = (e_sweat_orig + 0.06 * e_max) / latent_heat_w
        wleres = res_lh / latent_heat_w

        #------------------------------------------------------------------
        # Matrix
        #------------------------------------------------------------------
        # Matrix A
        # (83, 83,) ndarray
        bf_art, bf_vein = matrix.vessel_bloodflow(
                bf_cr, bf_ms, bf_fat, bf_sk, bf_ava_hand, bf_ava_foot
                )
        bf_local = matrix.localarr(
                bf_cr, bf_ms, bf_fat, bf_sk, bf_ava_hand, bf_ava_foot
                )
        bf_whole = matrix.wholebody(
                bf_art, bf_vein, bf_ava_hand, bf_ava_foot
                )
        arr_bf = np.zeros((NUM_NODES,NUM_NODES))
        arr_bf += bf_local
        arr_bf += bf_whole

        arr_bf /= self._cap.reshape((NUM_NODES,1)) # Change unit [W/K] to [/sec]
        arr_bf *= dtime # Change unit [/sec] to [-]

        arr_cdt = self._cdt.copy()
        arr_cdt /= self._cap.reshape((NUM_NODES,1)) # Change unit [W/K] to [/sec]
        arr_cdt *= dtime # Change unit [/sec] to [-]

        arrB = np.zeros(NUM_NODES)
        arrB[INDEX["skin"]] += 1/r_t*self._bsa
        arrB /= self._cap # Change unit [W/K] to [/sec]
        arrB *= dtime # Change unit [/sec] to [-]

        arrA_tria = -(arr_cdt + arr_bf)

        arrA_dia = arr_cdt + arr_bf
        arrA_dia = arrA_dia.sum(axis=1) + arrB
        arrA_dia = np.diag(arrA_dia)
        arrA_dia += np.eye(NUM_NODES)

        arrA = arrA_tria + arrA_dia
        arrA_inv = np.linalg.inv(arrA)

        # Matrix Q [W] / [J/K] * [sec] = [-]
        # Thermogensis
        arrQ = np.zeros(NUM_NODES)
        arrQ[INDEX["core"]] += qcr
        arrQ[INDEX["muscle"]] += qms[VINDEX["muscle"]]
        arrQ[INDEX["fat"]] += qfat[VINDEX["fat"]]
        arrQ[INDEX["skin"]] += qsk

        # Respiratory [W]
        arrQ[INDEX["core"][2]] -= res_sh + res_lh #Chest core

        # Sweating [W]
        arrQ[INDEX["skin"]] -= e_sk

        # Extra heat gain [W]
        arrQ += self.ex_q.copy()

        arrQ /= self._cap # Change unit [W]/[J/K] to [K/sec]
        arrQ *= dtime # Change unit [K/sec] to [K]

        # Boundary batrix [℃]
        arr_to = np.zeros(NUM_NODES)
        arr_to[INDEX["skin"]] += to

        # all
        arr = self._bodytemp + arrB * arr_to + arrQ

        #------------------------------------------------------------------
        # New body temp. [oC]
        #------------------------------------------------------------------
        self._bodytemp = np.dot(arrA_inv, arr)

        #------------------------------------------------------------------
        # Output paramters
        #------------------------------------------------------------------
        dictout = {}
        if output:  # Default output
            dictout["CycleTime"] = self._cycle
            dictout["ModTime"] = self._t
            dictout["dt"] = dtime
            dictout["TskMean"] = self.TskMean
            dictout["Tsk"] = self.Tsk
            dictout["Tcr"] = self.Tcr
            dictout["WetMean"] = np.average(wet, weights=_BSAst)
            dictout["Wet"] = wet
            dictout["Wle"] = (wlesk.sum() + wleres)
            dictout["CO"] = co
            dictout["Met"] = qall
            dictout["RES"] = res_sh + res_lh
            dictout["THLsk"] = shlsk + e_sk


        detailout = {}
        if self._ex_output and output:
            detailout["Name"] = self.model_name
            detailout["Height"] = self._height
            detailout["Weight"] = self._weight
            detailout["BSA"] = self._bsa
            detailout["Fat"] = self._fat
            detailout["Sex"] = self._sex
            detailout["Age"] = self._age
            detailout["Setptcr"] = setpt_cr
            detailout["Setptsk"] = setpt_sk
            detailout["Tcb"] = self.Tcb
            detailout["Tar"] = self.Tar
            detailout["Tve"] = self.Tve
            detailout["Tsve"] = self.Tsve
            detailout["Tms"] = self.Tms
            detailout["Tfat"] = self.Tfat
            detailout["To"] = to
            detailout["Rt"] = r_t
            detailout["Ret"] = r_et
            detailout["Ta"] = self._ta.copy()
            detailout["Tr"] = self._tr.copy()
            detailout["RH"] = self._rh.copy()
            detailout["Va"] = self._va.copy()
            detailout["PAR"] = self._par
            detailout["Icl"] = self._clo.copy()
            detailout["Esk"] = e_sk
            detailout["Emax"] = e_max
            detailout["Esweat"] = e_sweat
            detailout["BFcr"] = bf_cr
            detailout["BFms"] = bf_ms[VINDEX["muscle"]]
            detailout["BFfat"] = bf_fat[VINDEX["fat"]]
            detailout["BFsk"] = bf_sk
            detailout["BFava_hand"] = bf_ava_hand
            detailout["BFava_foot"] = bf_ava_foot
            detailout["Mbasecr"] = mbase[0]
            detailout["Mbasems"] = mbase[1][VINDEX["muscle"]]
            detailout["Mbasefat"] = mbase[2][VINDEX["fat"]]
            detailout["Mbasesk"] = mbase[3]
            detailout["Mwork"] = mwork
            detailout["Mshiv"] = mshiv
            detailout["Mnst"] = mnst
            detailout["Qcr"] = qcr
            detailout["Qms"] = qms[VINDEX["muscle"]]
            detailout["Qfat"] = qfat[VINDEX["fat"]]
            detailout["Qsk"] = qsk
            dictout["SHLsk"] = shlsk
            dictout["LHLsk"] = e_sk
            dictout["RESsh"] = res_sh
            dictout["RESlh"] = res_lh


        if self._ex_output == "all":
            dictout.update(detailout)
        elif isinstance(self._ex_output, list):  # if ex_out type is list
            outkeys = detailout.keys()
            for key in self._ex_output:
                if key in outkeys:
                    dictout[key] = detailout[key]
        return dictout


    def dict_results(self):
        """
        Get results as pandas.DataFrame format.

        Returns
        -------
        Dictionaly of the results
        """
        if not self._history:
            print("The model has no data.")
            return None

        def check_word_contain(word, *args):
            """
            Check if word contains *args.
            """
            boolfilter = False
            for arg in args:
                if arg in word:
                    boolfilter = True
            return boolfilter

        # Set column titles
        # If the values are iter, add the body names as suffix words.
        # If the values are not iter and the single value data, convert it to iter.
        key2keys = {}  # Column keys
        for key, value in self._history[0].items():
            try:
                length = len(value)
                if isinstance(value, str):
                    keys = [key]  # str is iter. Convert to list without suffix
                elif check_word_contain(key, "sve", "sfv", "superficialvein"):
                    keys = [key+BODY_NAMES[i] for i in VINDEX["sfvein"]]
                elif check_word_contain(key, "ms", "muscle"):
                    keys = [key+BODY_NAMES[i] for i in VINDEX["muscle"]]
                elif check_word_contain(key, "fat"):
                    keys = [key+BODY_NAMES[i] for i in VINDEX["fat"]]
                elif length == 17:  # if data contains 17 values
                    keys = [key+bn for bn in BODY_NAMES]
                else:
                    keys = [key+BODY_NAMES[i] for i in range(length)]
            except TypeError:  # if the value is not iter.
                keys= [key]  # convert to iter
            key2keys.update({key: keys})

        data = []
        for i, dictout in enumerate(self._history):
            row = {}
            for key, value in dictout.items():
                keys = key2keys[key]
                if len(keys) == 1:
                    values = [value]  # make list if value is not iter
                else:
                    values = value
                row.update(dict(zip(keys, values)))
            data.append(row)

        outdict = dict(zip(data[0].keys(), [[] for i in range(len(data[0].keys()))]))
        for row in data:
            for k in data[0].keys():
                outdict[k].append(row[k])
        return outdict


    def to_csv(self, path=None, folder=None, unit=True, meanig=True):
        """
        Export results as csv format.

        Parameters
        ----------
        path : str, optional
            Output path. If you don't use the default file name, set a name.
            The default is None.
        folder : str, optional
            Output folder. If you use the default file name with the current time,
            set a only folder path.
            The default is None.
        unit : bool, optional
            Write units in csv file. The default is True.
        meaning : bool, optional
            Write meanings of the parameters in csv file. The default is True.


        Examples
        ----------
        >>> import jos3
        >>> model = jos3.JOS3()
        >>> model.simulate(60)
        >>> model.to_csv(folder="C:/Users/takahashi/desktop")
        """

        if path is None:
            nowtime = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
            path = "{}_{}.csv".format(self.model_name, nowtime)
            if folder:
                os.makedirs(folder, exist_ok=True)
                path = folder + os.sep + path
        elif not ((path[-4:] == ".csv") or (path[-4:] == ".txt")):
            path += ".csv"
        dictout = self.dict_results()

        columns = [k for k in dictout.keys()]
        units = []
        meanigs = []
        for col in columns:
            param, rbn = remove_bodyname(col)
            if param in ALL_OUT_PARAMS:
                u = ALL_OUT_PARAMS[param]["unit"]
                units.append(u)

                m = ALL_OUT_PARAMS[param]["meaning"]
                if rbn:
                    meanigs.append(m.replace("body part", rbn))
                else:
                    meanigs.append(m)
            else:
                units.append("")
                meanigs.append("")

        with open(path, "wt", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(list(columns))
            if unit: writer.writerow(units)
            if meanig: writer.writerow(meanigs)
            for i in range(len(dictout["CycleTime"])):
                row = []
                for k in columns:
                    row.append(dictout[k][i])
                writer.writerow(row)


    #--------------------------------------------------------------------------
    # Setter
    #--------------------------------------------------------------------------
    def _set_ex_q(self, tissue, value):
        """
        Set extra heat gain by tissue name.

        Parameters
        ----------
        tissue : str
            Tissue name. "core", "skin", or "artery".... If you set value to
            Head muscle and other segment's core, set "all_muscle".
        value : int, float, array
            Heat gain [W]

        Returns
        -------
        array
            Extra heat gain of model.
        """
        self.ex_q[INDEX[tissue]] = value
        return self.ex_q


    #--------------------------------------------------------------------------
    # Setter & getter
    #--------------------------------------------------------------------------

    @property
    def Ta(self):
        """
        Getter

        Returns
        -------
        Ta : numpy.ndarray (17,)
            Air temperature [oC].
        """
        return self._ta
    @Ta.setter
    def Ta(self, inp):
        self._ta = _to17array(inp)

    @property
    def Tr(self):
        """
        Getter

        Returns
        -------
        Tr : numpy.ndarray (17,)
            Mean radiant temperature [oC].
        """
        return self._tr
    @Tr.setter
    def Tr(self, inp):
        self._tr = _to17array(inp)

    @property
    def To(self):
        """
        Getter

        Returns
        -------
        To : numpy.ndarray (17,)
            Operative temperature [oC].
        """
        hc = threg.fixed_hc(threg.conv_coef(self._posture, self._va, self._ta, self.Tsk,), self._va)
        hr = threg.fixed_hr(threg.rad_coef(self._posture,))
        # scale convective and radiative coefficients according to clothing properties
        # Air permeability reduces convective heat transfer (wind‑blocking garments)
        perm = _to17array(self._airperm)
        hc = hc * perm
        # Emissivity reduces radiative heat transfer
        eps = _to17array(self._emissivity)
        hr = hr * eps
        to = threg.operative_temp(self._ta, self._tr, hc, hr,)
        return to
    @To.setter
    def To(self, inp):
        self._ta = _to17array(inp)
        self._tr = _to17array(inp)

    @property
    def RH(self):
        """
        Getter

        Returns
        -------
        RH : numpy.ndarray (17,)
            Relative humidity [%].
        """
        return self._rh
    @RH.setter
    def RH(self, inp):
        self._rh = _to17array(inp)

    @property
    def Va(self):
        """
        Getter

        Returns
        -------
        Va : numpy.ndarray (17,)
            Air velocity [m/s].
        """
        return self._va
    @Va.setter
    def Va(self, inp):
        self._va = _to17array(inp)

    @property
    def posture(self):
        """
        Getter

        Returns
        -------
        posture : str
            Current JOS3 posture.
        """
        return self._posture
    @posture.setter
    def posture(self, inp):
        if inp == 0:
            self._posture = "standing"
        elif inp == 1:
            self._posture = "sitting"
        elif inp == 2:
            self._posture = "lying"
        elif type(inp) == str:
            if inp.lower() == "standing":
                self._posture = "standing"
            elif inp.lower() in ["sitting", "sedentary"]:
                self._posture = "sitting"
            elif inp.lower() in ["lying", "supine"]:
                self._posture = "lying"
        else:
            self._posture = "standing"
            print('posture must be 0="standing", 1="sitting" or 2="lying".')
            print('posture was set "standing".')

    @property
    def Icl(self):
        """
        Getter

        Returns
        -------
        Icl : numpy.ndarray (17,)
            Clothing insulation [clo].
        """
        return self._clo
    @Icl.setter
    def Icl(self, inp):
        self._clo = _to17array(inp)

    @property
    def Icl_emissivity(self):
        """
        Getter for clothing emissivity.

        Returns
        -------
        numpy.ndarray (17,)
            Segment‑wise emissivity coefficients. Values between 0 and 1
            determine how much radiant heat is emitted; 1 means full emission,
            lower values reduce radiative heat transfer.
        """
        return self._emissivity

    @Icl_emissivity.setter
    def Icl_emissivity(self, inp):
        """
        Setter for clothing emissivity.

        Parameters
        ----------
        inp : int, float, list or array-like
            Either a scalar or an iterable of length 17. If a scalar is
            provided, it is broadcast to all segments. Typical values lie
            between 0 (no emission) and 1 (perfect emitter). Values are
            floored at a small epsilon to avoid a zero radiative
            coefficient (see ``_MIN_CLO_COEF``).
        """
        self._emissivity = np.clip(_to17array(inp), _MIN_CLO_COEF, 1.0)

    @property
    def Icl_airperm(self):
        """
        Getter for clothing air permeability.

        Returns
        -------
        numpy.ndarray (17,)
            Segment‑wise air permeability coefficients. Values between
            0 and 1 describe the degree of wind penetration through the
            clothing: 1 means no wind protection (air flows freely), 0
            represents a fully windproof garment.
        """
        return self._airperm

    @Icl_airperm.setter
    def Icl_airperm(self, inp):
        """
        Setter for clothing air permeability.

        Parameters
        ----------
        inp : int, float, list or array-like
            Either a scalar or an iterable of length 17. When a scalar is
            supplied, it is broadcast to all segments. Values should
            typically be between 0 (windproof) and 1 (fully permeable).
            Values are floored at a small epsilon to avoid a zero
            convective coefficient, which would make the evaporative
            resistance infinite and corrupt the simulation state (see
            ``_MIN_CLO_COEF``).
        """
        self._airperm = np.clip(_to17array(inp), _MIN_CLO_COEF, 1.0)

    # -----------------------------------------------------------------
    # Water absorption parameters
    # -----------------------------------------------------------------
    @property
    def Icl_waterabs(self):
        """
        Getter for clothing sweat absorption fraction.

        Each element represents the fraction of newly produced sweat on a
        body segment that is absorbed into the clothing rather than
        evaporating immediately. 0 = keine Aufnahme (alles verdunstet
        sofort), 1 = komplette Aufnahme.  Scalars are broadcast to
        all segments.
        """
        return self._waterabs

    @Icl_waterabs.setter
    def Icl_waterabs(self, inp):
        """
        Setter for clothing sweat absorption fraction.

        Accepts a scalar or iterable of length 17.  Values are clipped
        between 0 and 1.  Scalars are broadcast across all segments.
        """
        arr = _to17array(inp)
        arr = np.clip(arr, 0.0, 1.0)
        self._waterabs = arr

    # Provide an alias with an underscore to accommodate alternate naming
    # conventions.  ``Icl_water_abs`` simply forwards to ``Icl_waterabs``.
    @property
    def Icl_water_abs(self):  # pragma: no cover - alias
        """
        Alias for :pyattr:`Icl_waterabs`.

        Some code or user interfaces may refer to the clothing sweat
        absorption fraction with an underscore in the name.  This
        property provides access to the same underlying data as
        :pyattr:`Icl_waterabs`.
        """
        return self.Icl_waterabs

    @Icl_water_abs.setter  # pragma: no cover - alias
    def Icl_water_abs(self, inp):
        self.Icl_waterabs = inp

    @property
    def release_tau(self):
        """
        Getter for the water release time constant τ [s].

        This parameter controls how quickly water stored in the clothing
        evaporates back into the environment.  Larger values indicate
        slower drying fabrics.  Scalars are broadcast to all segments.
        """
        return self._release_tau

    @release_tau.setter
    def release_tau(self, inp):
        """
        Setter for the water release time constant τ [s].

        Accepts a scalar or iterable of length 17.  Values must be
        positive; non‑positive entries are replaced with a small positive
        number to avoid division by zero.  Scalars are broadcast across
        all segments.
        """
        arr = _to17array(inp)
        arr = np.maximum(arr, 1e-3)
        self._release_tau = arr

    @property
    def max_storage(self):
        """
        Getter for the maximum water storage capacity [g].

        Specifies the maximum amount of water each clothing segment can
        hold before excess moisture instantly evaporates or drips off.
        Scalars are broadcast to all segments.
        """
        return self._max_storage

    @max_storage.setter
    def max_storage(self, inp):
        """
        Setter for the maximum water storage capacity [g].

        Accepts a scalar or iterable of length 17.  Values must be
        positive; non‑positive entries are replaced with a small positive
        number.  Scalars are broadcast across all segments.
        """
        arr = _to17array(inp)
        arr = np.maximum(arr, 1e-6)
        self._max_storage = arr

    @property
    def Icl_evap_eff(self):
        """
        Getter for clothing evaporative efficiency (vapor permeation efficiency).

        This coefficient describes how easily moisture vapor passes through
        clothing.  Values range from 0 (no vapor permeation; completely
        waterproof) to 1 (full permeation).  Typical textile clothing has an
        efficiency around 0.45.  Internally this property maps to the
        variable ``_iclo`` which is used in the evaporation resistance
        calculation.  If a scalar is provided it is broadcast to all
        17 segments.

        Returns
        -------
        numpy.ndarray (17,)
            Segment‑wise vapor permeation efficiencies.
        """
        return self._iclo

    @Icl_evap_eff.setter
    def Icl_evap_eff(self, inp):
        """
        Setter for clothing evaporative efficiency.

        Parameters
        ----------
        inp : int, float, list or array-like
            Either a scalar value or an iterable of length 17.  Values
            should lie between 0 and 1, where higher values indicate more
            efficient moisture transport through the clothing layer.  The
            input is broadcast across all segments when a scalar is
            provided.
        """
        self._iclo = _to17array(inp)


    @property
    def PAR(self):
        """
        Getter

        Returns
        -------
        PAR : float
            Physical activity ratio [-].
            This equals the ratio of metaboric rate to basal metablic rate.
            PAR of sitting quietly is 1.2.
        """
        return self._par
    @PAR.setter
    def PAR(self, inp):
        self._par = inp

    @property
    def bodytemp(self):
        """
        Getter

        Returns
        -------
        bodytemp : numpy.ndarray (85,)
            All segment temperatures of JOS-3
        """
        return self._bodytemp
    @bodytemp.setter
    def bodytemp(self, inp):
        self._bodytemp = inp.copy()

    #--------------------------------------------------------------------------
    # Getter
    #--------------------------------------------------------------------------

    @property
    def BSA(self):
        """
        Getter

        Returns
        -------
        BSA : numpy.ndarray (17,)
            Body surface areas by local body segments [m2].
        """
        return self._bsa.copy()

    @property
    def Rt(self):
        """
        Getter

        Returns
        -------
        Rt : numpy.ndarray (17,)
            Dry heat resistances between the skin and ambience areas by local body segments [K.m2/W].
        """
        hc = threg.fixed_hc(threg.conv_coef(self._posture, self._va, self._ta, self.Tsk,), self._va)
        hr = threg.fixed_hr(threg.rad_coef(self._posture,))
        # apply clothing properties: air permeability and emissivity
        perm = _to17array(self._airperm)
        hc = hc * perm
        eps = _to17array(self._emissivity)
        hr = hr * eps
        return threg.dry_r(hc, hr, self._clo)

    @property
    def Ret(self):
        """
        Getter

        Returns
        -------
        Ret : numpy.ndarray (17,)
            Wet (Evaporative) heat resistances between the skin and ambience areas by local body segments [Pa.m2/W].
        """
        hc = threg.fixed_hc(threg.conv_coef(self._posture, self._va, self._ta, self.Tsk,), self._va)
        # Air permeability (wind-blocking) affects only the dry pathway (see
        # Rt/_run) -- vapor transport is governed independently by the
        # intrinsic clothing vapor permeability, so hc is left unscaled here.
        # Return evaporative resistance based solely on intrinsic clothing vapor
        # permeation efficiency.  Water absorption effects are handled in
        # the evaporation and weight-loss calculations.
        return threg.wet_r(hc, self._clo, self._iclo)

    @property
    def Wet(self):
        """
        Getter

        Returns the wettedness computed by the most recent simulation step,
        i.e. the same value found in dict_results()/to_csv() -- including
        the water absorption/delayed evaporation adjustment (see _run())
        when clothing water absorption is in use, which a fresh recompute
        from threg.evaporation() would not reflect.

        Returns
        -------
        Wet : numpy.ndarray (17,)
            Skin wettedness on local body segments [-].
        """
        return self._last_wet

    @property
    def WetMean(self):
        """
        Getter

        Returns
        -------
        WetMean : float
            Mean skin wettedness of the whole body [-].
        """
        wet = self.Wet
        return np.average(wet, weights=_BSAst)



    @property
    def TskMean(self):
        """
        Getter

        Returns
        -------
        TskMean : float
            Mean skin temperature of the whole body [oC].
        """
        return np.average(self._bodytemp[INDEX["skin"]], weights=_BSAst)

    @property
    def Tsk(self):
        """
        Getter

        Returns
        -------
        Tsk : numpy.ndarray (17,)
            Skin temperatures by the local body segments [oC].
        """
        return self._bodytemp[INDEX["skin"]].copy()

    @property
    def Tcr(self):
        """
        Getter

        Returns
        -------
        Tcr : numpy.ndarray (17,)
            Skin temperatures by the local body segments [oC].
        """
        return self._bodytemp[INDEX["core"]].copy()

    @property
    def Tcb(self):
        """
        Getter

        Returns
        -------
        Tcb : numpy.ndarray (1,)
            Core temperatures by the local body segments [oC].
        """
        return self._bodytemp[0].copy()

    @property
    def Tar(self):
        """
        Getter

        Returns
        -------
        Tar : numpy.ndarray (17,)
            Arterial temperatures by the local body segments [oC].
        """
        return self._bodytemp[INDEX["artery"]].copy()

    @property
    def Tve(self):
        """
        Getter

        Returns
        -------
        Tve : numpy.ndarray (17,)
            Vein temperatures by the local body segments [oC].
        """
        return self._bodytemp[INDEX["vein"]].copy()

    @property
    def Tsve(self):
        """
        Getter

        Returns
        -------
        Tsve : numpy.ndarray (12,)
            Superfical vein temperatures by the local body segments [oC].
        """
        return self._bodytemp[INDEX["sfvein"]].copy()

    @property
    def Tms(self):
        """
        Getter

        Returns
        -------
        Tms : numpy.ndarray (2,)
            Muscle temperatures of Head and Pelvis [oC].
        """
        return self._bodytemp[INDEX["muscle"]].copy()

    @property
    def Tfat(self):
        """
        Getter

        Returns
        -------
        Tfat : numpy.ndarray (2,)
            Fat temperatures of Head and Pelvis  [oC].
        """
        return self._bodytemp[INDEX["fat"]].copy()

    @property
    def bodyname(self):
        """
        Getter

        Returns
        -------
        bodyname : list
            JOS3 body names,
            "Head", "Neck", "Chest", "Back", "Pelvis",
            "LShoulder", "LArm", "LHand",
            "RShoulder", "RArm", "RHand",
            "LThigh", "LLeg", "LHand",
            "RThigh", "RLeg" and "RHand".
        """
        body = [
                "Head", "Neck", "Chest", "Back", "Pelvis",
                "LShoulder", "LArm", "LHand",
                "RShoulder", "RArm", "RHand",
                "LThigh", "LLeg", "LHand",
                "RThigh", "RLeg", "RHand",]
        return body

    @property
    def results(self):
        return self.dict_results()

    @property
    def BMR(self):
        """
        Getter

        Returns
        -------
        BMR : float
            Basal metabolic rate [W/m2].
        """
        bmr = threg.basal_met(
                self._height, self._weight, self._age,
                self._sex, self._bmr_equation,)
        return bmr / self.BSA.sum()


# Lower bound for Icl_airperm/Icl_emissivity. hc and hr appear in
# denominators downstream (e.g. wet_r's r_ea = 1/(hc*lewis_rate*...)), so an
# exact 0 causes a division by zero that poisons the simulation state
# (water_storage becomes NaN and never recovers). A small positive floor
# keeps "fully windproof"/"non-emissive" as a practical limit instead.
_MIN_CLO_COEF = 1e-3


def _to17array(inp):
    """
    Make ndarray (17,).

    Parameters
    ----------
    inp : int, float, ndarray, list
        Number you make as 17array.

    Returns
    -------
    ndarray
    """
    try:
        if len(inp) == 17:
            array = np.array(inp)
        else:
            first_item = inp[0]
            array = np.ones(17)*first_item
    except:
        array = np.ones(17)*inp
    return array.copy()

if __name__ == "__main__":
    import jos3